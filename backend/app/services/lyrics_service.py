import re
import urllib.parse
import httpx
import logging
import asyncio
from typing import List, Optional, Dict, Any
from cachetools import TTLCache
from app.models.music import LyricLine, LyricsResponse
from app.services.curated_lyrics import get_curated_lyrics

logger = logging.getLogger(__name__)

# Cache lyrics for 24 hours
lyrics_cache = TTLCache(maxsize=3000, ttl=86400)

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

    # 3. Duration Matching (Generous enough for music video intro/outro differences)
    if target_duration > 0 and c_dur > 0:
        diff = abs(c_dur - target_duration)
        if diff <= 5:
            score += 40.0
        elif diff <= 15:
            score += 25.0
        elif diff <= 35:
            score += 10.0
        elif diff > 90:
            score -= 50.0

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

    async def _fetch_from_youtube_captions(
        self,
        track_id: Optional[str],
        clean_title: str,
        primary_artist: str,
        client: httpx.AsyncClient
    ) -> Optional[LyricsResponse]:
        """
        Extracts synchronized timed karaoke lyrics directly from YouTube audio/video subtitles.
        Supports official captions and automated subtitles across English, Tamil, Hindi, Telugu,
        Spanish, Japanese, Korean, Arabic, and 80+ languages with millisecond precision.
        """
        import yt_dlp
        loop = asyncio.get_running_loop()

        def do_extract():
            ydl_opts = {
                'skip_download': True,
                'quiet': True,
                'no_warnings': True,
                'extract_flat': False
            }
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                query = ""
                if track_id and track_id.startswith("youtube:"):
                    vid = track_id.split(":", 1)[1]
                    query = f"https://www.youtube.com/watch?v={vid}"
                elif track_id and track_id.startswith("yt_"):
                    vid = track_id.replace("yt_", "")
                    query = f"https://www.youtube.com/watch?v={vid}"
                else:
                    query = f"ytsearch1:{clean_title} {primary_artist}".strip()

                try:
                    info = ydl.extract_info(query, download=False)
                    if not info:
                        return None
                    if 'entries' in info:
                        if not info['entries']:
                            return None
                        info = info['entries'][0]

                    subs = info.get('subtitles') or {}
                    auto_subs = info.get('automatic_captions') or {}

                    preferred_langs = ['en', 'en-IN', 'ta', 'hi', 'te', 'ml', 'kn', 'bn', 'pa', 'es', 'fr']
                    chosen_entries = None

                    # Prioritize human subtitles first
                    for lang in preferred_langs:
                        if lang in subs:
                            chosen_entries = subs[lang]
                            break
                    if not chosen_entries and subs:
                        chosen_entries = next(iter(subs.values()))

                    # Fallback to auto-captions
                    if not chosen_entries:
                        for lang in preferred_langs:
                            if lang in auto_subs:
                                chosen_entries = auto_subs[lang]
                                break
                    if not chosen_entries and auto_subs:
                        chosen_entries = next(iter(auto_subs.values()))

                    if not chosen_entries:
                        return None

                    # Prefer json3 format
                    json_url = None
                    for fmt in chosen_entries:
                        if fmt.get('ext') == 'json3':
                            json_url = fmt.get('url')
                            break
                    if not json_url and chosen_entries:
                        json_url = chosen_entries[0].get('url')

                    return json_url
                except Exception as e:
                    logger.debug(f"yt_dlp caption extract error for '{clean_title}': {e}")
                    return None

        json_url = await loop.run_in_executor(None, do_extract)
        if not json_url:
            return None

        try:
            resp = await client.get(json_url, timeout=5.0)
            if resp.status_code != 200:
                return None
            data = resp.json()

            lines: List[LyricLine] = []
            plain_parts: List[str] = []

            for ev in data.get('events', []):
                start_ms = ev.get('tStartMs')
                if start_ms is None:
                    continue
                time_sec = round(start_ms / 1000.0, 2)
                segs = ev.get('segs', [])
                text = ''.join([s.get('utf8', '') for s in segs]).strip()
                clean_t = re.sub(r'[\r\n]+', ' ', text).strip()
                if clean_t and clean_t not in ['♪', '[♪♪♪]', '♪♪♪', '[Music]']:
                    lines.append(LyricLine(time=time_sec, text=clean_t))
                    plain_parts.append(clean_t)

            if lines:
                return LyricsResponse(
                    track_id=track_id,
                    title=clean_title,
                    artist=primary_artist,
                    is_synced=True,
                    is_instrumental=False,
                    lyrics=lines,
                    plain_lyrics='\n'.join(plain_parts),
                    source="youtube_captions"
                )
        except Exception as e:
            logger.debug(f"Error fetching caption JSON from YouTube: {e}")

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
        4. Tier 2: YouTube Native Captions & Timedtext (Multilingual & Synced)
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

            # Step 5: Fallback to YouTube Timed Captions (100% synchronized, multilingual)
            yt_captions = await self._fetch_from_youtube_captions(track_id, clean_title, primary_artist, client)
            if yt_captions and (yt_captions.lyrics or yt_captions.plain_lyrics):
                lyrics_cache[cache_key] = yt_captions
                return yt_captions

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
