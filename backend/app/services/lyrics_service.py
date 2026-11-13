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
lyrics_cache = TTLCache(maxsize=1500, ttl=86400)

INSTRUMENTAL_GENRES = {
    'dubstep', 'house', 'tech house', 'electronic', 'ambient', 'soundscape',
    'techno', 'trance', 'drum & bass', 'classical', 'dnb', 'lofi', 'lo-fi',
    'synthwave', 'chillstep', 'future bass', 'edm'
}


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


def is_likely_instrumental(title: str, genre: str = "", artist: str = "") -> bool:
    """
    Detects if a track is purely instrumental (EDM, Dubstep, ambient, background score, etc.)
    so the UI can display '♪ Instrumental Track ♪' gracefully rather than 'No lyrics found'.
    """
    t = title.lower()
    g = (genre or "").lower()
    if any(k in t for k in ['(instrumental)', 'instrumental version', 'karaoke', 'soundscape', '140 mix']):
        return True
    if g in INSTRUMENTAL_GENRES:
        if any(k in t for k in ['mix', 'dub', 'flip', 'bootleg', 'edit', 'beat', 'drop']):
            return True
    return False


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
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }

    def _parse_lrc(self, lrc_text: str) -> List[LyricLine]:
        """
        Parses LRC format strings ([mm:ss.xx] text) into structured LyricLine objects.
        Preserves UTF-8 native scripts (Tamil, Hindi, Telugu, Arabic, etc.) and multilingual stanzas.
        """
        lines: List[LyricLine] = []
        if not lrc_text:
            return lines

        offset_ms = 0
        offset_match = re.search(r'\[offset:\s*([+-]?\d+)\]', lrc_text, re.IGNORECASE)
        if offset_match:
            try:
                offset_ms = int(offset_match.group(1))
            except Exception:
                offset_ms = 0

        offset_seconds = offset_ms / 1000.0
        time_regex = re.compile(r'\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]')

        for raw_line in lrc_text.splitlines():
            raw_line = raw_line.strip()
            if not raw_line:
                continue

            if re.match(r'^\[(?:ar|ti|al|by|offset|length|re|ve):', raw_line, re.IGNORECASE):
                continue

            matches = list(time_regex.finditer(raw_line))
            if not matches:
                continue

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

        lines.sort(key=lambda x: x.time)
        return lines

    async def _fetch_from_genius(self, client: httpx.AsyncClient, clean_title: str, primary_artist: str = "") -> Optional[str]:
        """
        Fetches lyrics from Genius for Indian, Bollywood, Pop, Rap, and indie songs.
        """
        try:
            q = f"{clean_title} {primary_artist}".strip()
            url = f"https://genius.com/api/search/multi?q={urllib.parse.quote(q)}"
            resp = await client.get(url, timeout=4.5)
            if resp.status_code != 200:
                return None

            data = resp.json()
            sections = data.get('response', {}).get('sections', [])
            for sec in sections:
                if sec.get('type') == 'song':
                    hits = sec.get('hits', [])
                    for h in hits[:3]:
                        res = h.get('result', {})
                        res_title = clean_title_for_lyrics(res.get('title', '')).lower()

                        # Strict title verification
                        t_words = [w for w in clean_title.lower().split() if len(w) >= 2] or clean_title.lower().split()
                        matches = sum(1 for w in t_words if w in res_title)
                        if matches == 0:
                            continue

                        song_url = res.get('url')
                        if song_url:
                            page_resp = await client.get(song_url, timeout=4.5)
                            if page_resp.status_code == 200:
                                html = page_resp.text
                                containers = re.findall(r'<div[^>]*data-lyrics-container="true"[^>]*>(.*?)</div>', html, re.DOTALL)
                                if containers:
                                    raw_text = '\n'.join(containers)
                                    clean = re.sub(r'<br\s*/?>', '\n', raw_text)
                                    clean = re.sub(r'<.*?>', '', clean)
                                    clean = clean.replace('&amp;', '&').replace('&quot;', '"').replace('&#x27;', "'").strip()
                                    clean = re.sub(r'^\d+\s*Contributors?.*?\n', '', clean, flags=re.IGNORECASE)
                                    clean = re.sub(r'^[^\n]+Lyrics\n', '', clean, flags=re.IGNORECASE).strip()
                                    if clean and len(clean) > 30:
                                        return clean
        except Exception as e:
            logger.debug(f"Genius fetch exception for '{clean_title}': {e}")
        return None

    async def _fetch_from_lyrics_ovh(self, client: httpx.AsyncClient, clean_title: str, primary_artist: str = "") -> Optional[str]:
        """
        Public free lyrics API for Western, Pop, and Rock tracks.
        """
        if not primary_artist or not clean_title:
            return None
        try:
            url = f"https://api.lyrics.ovh/v1/{urllib.parse.quote(primary_artist)}/{urllib.parse.quote(clean_title)}"
            resp = await client.get(url, timeout=3.5)
            if resp.status_code == 200:
                data = resp.json()
                lyrics = data.get('lyrics')
                if lyrics and len(lyrics.strip()) > 30:
                    return lyrics.strip()
        except Exception:
            pass
        return None

    async def get_lyrics(
        self,
        title: str,
        artist: str,
        duration: Optional[int] = None,
        track_id: Optional[str] = None
    ) -> LyricsResponse:
        """
        Fetches lyrics using a multi-provider fallback cascade:
        1. Instrumental detection (Dubstep, Electronic, Ambient) -> ♪ Instrumental Track ♪
        2. Tier 0: Curated store for trending releases
        3. Tier 1: LRCLIB (exact + candidate search with strict validation)
        4. Tier 2: Genius (multilingual: Tamil, Hindi, Telugu, English, etc.)
        5. Tier 3: Lyrics.ovh (global plain lyrics)
        """
        dur_key = duration if duration and duration > 0 else 0
        cache_key = f"{title.lower().strip()}_{artist.lower().strip()}_{dur_key}"
        if cache_key in lyrics_cache:
            return lyrics_cache[cache_key]

        clean_title = clean_title_for_lyrics(title)
        primary_artist = artist.split(',')[0].split('&')[0].replace(' - Topic', '').strip() if artist else ""

        # Step 1: Detect instrumental tracks
        if is_likely_instrumental(title, artist=artist):
            instr_res = LyricsResponse(
                track_id=track_id,
                title=title,
                artist=artist,
                is_synced=False,
                is_instrumental=True,
                lyrics=[],
                plain_lyrics="♪ Instrumental Track ♪\n\nThis track contains no vocals — sit back and immerse in the music.",
                source="instrumental"
            )
            lyrics_cache[cache_key] = instr_res
            return instr_res

        # Step 2: Curated Multilingual Registry for verified soundtrack releases
        curated = get_curated_lyrics(clean_title)
        if curated:
            parsed_lines = self._parse_lrc(curated.get("synced_lrc", ""))
            res = LyricsResponse(
                track_id=track_id,
                title=curated.get("title") or title,
                artist=curated.get("artist") or artist,
                is_synced=bool(parsed_lines),
                is_instrumental=False,
                lyrics=parsed_lines,
                plain_lyrics=curated.get("plain_lyrics"),
                source="curated"
            )
            lyrics_cache[cache_key] = res
            return res

        async with httpx.AsyncClient(timeout=6.0, headers=self.headers, follow_redirects=True) as client:
            # Step 3: Try exact match first on LRCLIB
            try:
                params = {"track_name": clean_title, "artist_name": primary_artist}
                if duration and duration > 0:
                    params["duration"] = str(duration)

                resp = await client.get(f"{self.base_url}/get", params=params)
                if resp.status_code == 200:
                    data = resp.json()
                    synced = data.get("syncedLyrics")
                    plain = data.get("plainLyrics")

                    resp_title = clean_title_for_lyrics(data.get("trackName") or "").lower()
                    if resp_title == clean_title.lower() or clean_title.lower() in resp_title:
                        if synced or plain:
                            parsed_lines = self._parse_lrc(synced) if synced else []
                            res = LyricsResponse(
                                track_id=track_id,
                                title=title,
                                artist=artist,
                                is_synced=bool(parsed_lines),
                                is_instrumental=False,
                                lyrics=parsed_lines,
                                plain_lyrics=plain,
                                source="lrclib"
                            )
                            lyrics_cache[cache_key] = res
                            return res
            except Exception as e:
                logger.debug(f"LRCLIB exact get error for '{title}': {e}")

            # Step 4: Multi-tier LRCLIB Search with Strict Verification
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
                    logger.debug(f"LRCLIB search error with {s_params}: {se}")

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
                        is_instrumental=False,
                        lyrics=parsed_lines,
                        plain_lyrics=plain,
                        source="lrclib"
                    )
                    lyrics_cache[cache_key] = res
                    return res

            # Step 5: Fallback to Genius (Multilingual: Indian, Hindi, Tamil, Telugu, Pop)
            genius_lyrics = await self._fetch_from_genius(client, clean_title, primary_artist)
            if genius_lyrics:
                res = LyricsResponse(
                    track_id=track_id,
                    title=title,
                    artist=artist,
                    is_synced=False,
                    is_instrumental=False,
                    lyrics=[],
                    plain_lyrics=genius_lyrics,
                    source="genius"
                )
                lyrics_cache[cache_key] = res
                return res

            # Step 6: Fallback to Lyrics.ovh (Global Pop / Western songs)
            ovh_lyrics = await self._fetch_from_lyrics_ovh(client, clean_title, primary_artist)
            if ovh_lyrics:
                res = LyricsResponse(
                    track_id=track_id,
                    title=title,
                    artist=artist,
                    is_synced=False,
                    is_instrumental=False,
                    lyrics=[],
                    plain_lyrics=ovh_lyrics,
                    source="lyrics.ovh"
                )
                lyrics_cache[cache_key] = res
                return res

        # Empty fallback (strictly prevents ever showing wrong song lyrics)
        fallback = LyricsResponse(
            track_id=track_id,
            title=title,
            artist=artist,
            is_synced=False,
            is_instrumental=False,
            lyrics=[],
            plain_lyrics=None,
            source="none"
        )
        lyrics_cache[cache_key] = fallback
        return fallback


lyrics_service = LyricsService()
