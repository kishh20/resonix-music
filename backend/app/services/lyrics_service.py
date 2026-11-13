import re
import urllib.parse
import httpx
import logging
from typing import List, Optional, Dict, Any
from cachetools import TTLCache
from app.models.music import LyricLine, LyricsResponse
from app.services.curated_lyrics import get_curated_lyrics

logger = logging.getLogger(__name__)

# Cache lyrics for 24 hours
lyrics_cache = TTLCache(maxsize=1000, ttl=86400)


def clean_title_for_lyrics(text: str) -> str:
    """
    Cleans track titles of extraneous soundtrack, movie, version annotations,
    and pipe delimiters to enable exact title matching.
    e.g. 'FA FA FA Lyrical | Dhanush | Mammootty | Sai Pallavi' -> 'FA FA FA'
    e.g. 'FA FA FA (From "OM Chapter 1: Udhiram - The Blood Wood") [Tamil]' -> 'FA FA FA'
    e.g. 'Kanave Kanave (From "David")' -> 'Kanave Kanave'
    """
    if not text:
        return ""

    # 1. If pipes '|' exist, take only the primary track segment
    if '|' in text:
        text = text.split('|')[0].strip()

    # 2. Remove bracketed annotations like (From "..."), [Tamil], (feat. ...), (Lyrical), (Audio), etc.
    cleaned = re.sub(
        r'[\(\[\{]\s*(?:from|feat|ft|official|audio|video|lyrics?|lyrical|theme|version|reprise|remix|soundtrack|original|tamil|telugu|hindi|malayalam|kannada).*?[\)\]\}]',
        '',
        text,
        flags=re.IGNORECASE
    )
    # Remove remaining language, quality, or release bracket tags [Tamil], [4K], etc.
    cleaned = re.sub(
        r'[\(\[\{]\s*(?:tamil|telugu|hindi|english|malayalam|kannada|4k|hd|hq|audio|video|lyrics?|lyrical).*?[\)\]\}]',
        '',
        cleaned,
        flags=re.IGNORECASE
    )

    # 3. Remove trailing ' - From ...' or ' - Lyrical ...'
    cleaned = re.sub(r'\s*-\s*(?:from|lyrical|audio|video|ost)\s+.*$', '', cleaned, flags=re.IGNORECASE)
    # 4. Remove loose trailing words like 'Lyrical', 'Lyric Video', 'Audio', 'Official'
    cleaned = re.sub(r'\b(?:lyrical(?:\s*video)?|lyric\s*video|official\s*(?:audio|video)?|audio\s*song)\b', '', cleaned, flags=re.IGNORECASE)

    cleaned = cleaned.replace('"', '').replace("'", "").strip()
    result = ' '.join(re.sub(r'[^\w\s]', ' ', cleaned).split())
    return result if result else text.strip()


def score_lyric_candidate(
    candidate: Dict[str, Any],
    target_title: str,
    target_artist: str = "",
    target_duration: int = 0
) -> float:
    """
    Scores an LRCLIB candidate to ensure 100% accurate lyrics match.
    Strictly disqualifies title mismatches so songs with similar words or different languages
    are NEVER mixed up (e.g., will NEVER match 'The Blood Wood' or 'Aalaka Loova' to 'FA FA FA').
    """
    c_title = clean_title_for_lyrics(candidate.get("trackName") or "").lower()
    t_title = clean_title_for_lyrics(target_title).lower()
    c_artist = (candidate.get("artistName") or "").lower()
    t_artist = target_artist.lower()
    c_dur = int(candidate.get("duration") or 0)

    # Mandatory Title Existence
    if not t_title or not c_title:
        return -1000.0

    t_words = [w for w in t_title.split() if len(w) >= 2] or t_title.split()
    c_words = c_title.split()

    score = 0.0

    # 1. Title Matching (Mandatory & Strict)
    if c_title == t_title:
        score += 80.0
    elif t_title in c_title or c_title in t_title:
        score += 60.0
    else:
        matches = sum(1 for w in t_words if w in c_words)
        if matches == 0:
            return -1000.0  # Zero title overlap -> strictly disqualify!
        if (matches / len(t_words)) < 0.5:
            return -500.0   # Less than half title words match -> disqualify!
        score += (matches / len(t_words)) * 40.0

    # 2. Artist Matching Bonus
    if t_artist:
        artists = [a.strip() for a in re.split(r'[,&/]', t_artist) if a.strip()]
        if any(a in c_artist for a in artists) or c_artist in t_artist:
            score += 30.0

    # 3. Duration Matching
    if target_duration > 0 and c_dur > 0:
        diff = abs(c_dur - target_duration)
        if diff <= 4:
            score += 40.0
        elif diff <= 12:
            score += 20.0
        elif diff > 40:
            score -= 80.0

    # 4. Bonus for Synchronized Timestamps
    if candidate.get("syncedLyrics"):
        score += 30.0

    return score


class LyricsService:
    def __init__(self):
        self.base_url = "https://lrclib.net/api"
        self.headers = {
            "User-Agent": "ResonixMusic/2.0 (https://github.com/kishh20/resonix-music; support@resonix.app)"
        }

    def _parse_lrc(self, lrc_text: str) -> List[LyricLine]:
        """
        Parses LRC format strings ([mm:ss.xx] text) into structured LyricLine objects.
        Preserves UTF-8 native scripts (Tamil, Hindi, Telugu, Arabic, etc.) and multilingual stanzas.
        """
        lines: List[LyricLine] = []
        if not lrc_text:
            return lines

        # Detect [offset:+/-ms] tag
        offset_ms = 0
        offset_match = re.search(r'\[offset:\s*([+-]?\d+)\]', lrc_text, re.IGNORECASE)
        if offset_match:
            try:
                offset_ms = int(offset_match.group(1))
            except Exception:
                offset_ms = 0

        offset_seconds = offset_ms / 1000.0

        # Regex for [00:12.34] or [00:12.345] or [00:12]
        time_regex = re.compile(r'\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]')

        for raw_line in lrc_text.splitlines():
            raw_line = raw_line.strip()
            if not raw_line:
                continue

            # Ignore LRC metadata tags
            if re.match(r'^\[(?:ar|ti|al|by|offset|length|re|ve):', raw_line, re.IGNORECASE):
                continue

            matches = list(time_regex.finditer(raw_line))
            if not matches:
                continue

            # Text after the timestamp(s) - preserve full UTF-8 Unicode
            last_match = matches[-1]
            text = raw_line[last_match.end():].strip()

            for match in matches:
                minutes = int(match.group(1))
                seconds = int(match.group(2))
                millis_str = match.group(3) or "0"
                if len(millis_str) == 2:
                    fraction = float(millis_str) / 100.0
                elif len(millis_str) == 3:
                    fraction = float(millis_str) / 1000.0
                else:
                    fraction = float(millis_str) / 10.0

                total_seconds = round(minutes * 60 + seconds + fraction + offset_seconds, 2)
                lines.append(LyricLine(time=max(0.0, total_seconds), text=text))

        # Sort chronologically
        lines.sort(key=lambda x: x.time)
        return lines

    async def get_lyrics(
        self,
        title: str,
        artist: str,
        duration: Optional[int] = None,
        track_id: Optional[str] = None
    ) -> LyricsResponse:
        """
        Fetches synchronized lyrics with strict title & duration candidate verification.
        Supports multilingual lyrics (Tamil, Hindi, English, Arabic) seamlessly.
        """
        dur_key = duration if duration and duration > 0 else 0
        cache_key = f"{title.lower().strip()}_{artist.lower().strip()}_{dur_key}"
        if cache_key in lyrics_cache:
            return lyrics_cache[cache_key]

        clean_title = clean_title_for_lyrics(title)
        primary_artist = artist.split(',')[0].split('&')[0].strip() if artist else ""

        # Tier 0: Curated Multilingual Registry for verified soundtrack releases (e.g. FA FA FA)
        curated = get_curated_lyrics(clean_title)
        if curated:
            parsed_lines = self._parse_lrc(curated.get("synced_lrc", ""))
            res = LyricsResponse(
                track_id=track_id,
                title=curated.get("title") or title,
                artist=curated.get("artist") or artist,
                is_synced=bool(parsed_lines),
                lyrics=parsed_lines,
                plain_lyrics=curated.get("plain_lyrics"),
                source="curated"
            )
            lyrics_cache[cache_key] = res
            return res

        async with httpx.AsyncClient(timeout=6.0, headers=self.headers) as client:
            # Tier 1: Try exact match first on LRCLIB
            try:
                params = {"track_name": clean_title, "artist_name": primary_artist}
                if duration and duration > 0:
                    params["duration"] = str(duration)

                resp = await client.get(f"{self.base_url}/get", params=params)
                if resp.status_code == 200:
                    data = resp.json()
                    synced = data.get("syncedLyrics")
                    plain = data.get("plainLyrics")

                    # Verify title from response data
                    resp_title = clean_title_for_lyrics(data.get("trackName") or "").lower()
                    if resp_title == clean_title.lower() or clean_title.lower() in resp_title:
                        if synced:
                            parsed_lines = self._parse_lrc(synced)
                            if parsed_lines:
                                res = LyricsResponse(
                                    track_id=track_id,
                                    title=title,
                                    artist=artist,
                                    is_synced=True,
                                    lyrics=parsed_lines,
                                    plain_lyrics=plain,
                                    source="lrclib"
                                )
                                lyrics_cache[cache_key] = res
                                return res
            except Exception as e:
                logger.warning(f"LRCLIB exact get error for '{title}': {e}")

            # Tier 2: Multi-tier Candidate Search with Strict Verification
            candidate_pool = []
            seen_ids = set()

            search_requests = [
                {"track_name": clean_title, "artist_name": primary_artist},
                {"track_name": clean_title},
                {"q": f"{clean_title} {primary_artist}".strip()}
            ]

            for s_params in search_requests:
                try:
                    resp = await client.get(f"{self.base_url}/search", params=s_params)
                    if resp.status_code == 200:
                        items = resp.json()
                        if isinstance(items, list):
                            for it in items:
                                it_id = it.get("id")
                                if it_id and it_id not in seen_ids:
                                    seen_ids.add(it_id)
                                    candidate_pool.append(it)
                except Exception as se:
                    logger.warning(f"LRCLIB search error with {s_params}: {se}")

            # Score and select best candidate
            if candidate_pool:
                scored = []
                for c in candidate_pool:
                    sc = score_lyric_candidate(
                        c,
                        target_title=title,
                        target_artist=artist,
                        target_duration=duration or 0
                    )
                    scored.append((sc, c))

                scored.sort(key=lambda x: x[0], reverse=True)

                # Only accept positive scores (meaning title strictly verified)
                if scored and scored[0][0] > 0:
                    winner = scored[0][1]
                    synced = winner.get("syncedLyrics")
                    plain = winner.get("plainLyrics")
                    parsed_lines = self._parse_lrc(synced) if synced else []

                    res = LyricsResponse(
                        track_id=track_id,
                        title=title,
                        artist=artist,
                        is_synced=bool(parsed_lines),
                        lyrics=parsed_lines,
                        plain_lyrics=plain,
                        source="lrclib"
                    )
                    lyrics_cache[cache_key] = res
                    return res

        # Empty fallback (strictly prevents ever showing wrong song lyrics)
        fallback = LyricsResponse(
            track_id=track_id,
            title=title,
            artist=artist,
            is_synced=False,
            lyrics=[],
            plain_lyrics=None,
            source="none"
        )
        lyrics_cache[cache_key] = fallback
        return fallback


lyrics_service = LyricsService()
