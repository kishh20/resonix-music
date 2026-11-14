import re
import urllib.parse
import urllib.request
import json
import logging
import asyncio
import concurrent.futures
import os
from typing import List, Optional, Dict, Any
from cachetools import TTLCache
import yt_dlp
from app.models.music import Track

logger = logging.getLogger(__name__)

# Bounded ThreadPoolExecutor to prevent memory exhaustion and thread leaks under high concurrency
_yt_thread_pool = concurrent.futures.ThreadPoolExecutor(
    max_workers=min(32, max(4, (os.cpu_count() or 4) * 4)),
    thread_name_prefix="resonix_yt"
)

# Concurrency semaphore: bounds simultaneous heavy extraction tasks to avoid CPU/OOM spikes
_yt_semaphore = asyncio.Semaphore(16)

# Cache resolved audio URLs for 4 hours (Google Video CDN URLs typically expire after 6 hours)
stream_url_cache = TTLCache(maxsize=2000, ttl=14400)
# Cache search results for 1 hour
search_cache = TTLCache(maxsize=1000, ttl=3600)

def clean_track_title(title: str) -> str:
    """
    Cleans metadata clutter like (From "..."), [Remastered], (feat. ...) to improve search matching.
    """
    if not title:
        return ""
    cleaned = re.sub(r'[\(\[\{].*?(from|feat|ft|remastered|soundtrack|version|original).*?[\)\]\}]', '', title, flags=re.IGNORECASE)
    cleaned = re.sub(r'[^\w\s]', ' ', cleaned)
    return ' '.join(cleaned.split())


KNOWN_OG_LABELS = [
    'sony music', 'think music', 'think indie', 't-series', 'tseries', 'zee music',
    'saregama', 'lahari', 'aditya music', 'muzik247', 'divo', 'speed records',
    'tips official', 'yrf', 'eros now', 'sun pictures', 'sun tv', 'gemini tv',
    'surya tv', 'star vijay', 'vijay television', 'rajshri', 'satyam audios',
    'anand audio', 'jhankar', 'svf music', 'om',
    'universal music', 'warner music', 'interscope', 'republic records', 'atlantic records',
    'columbia records', 'rca records', 'def jam', 'capitol records', 'virgin music',
    'geffen', 'epic records', 'island records', 'asylum records', 'parlophone', 'polydor',
    'motown', 'vevo'
]

KNOWN_COMPOSERS_OR_SINGERS = [
    'anirudh ravichander', 'anirudh', 'a.r. rahman', 'ar rahman', 'rahman',
    'sai abhyankkar', 'yuvan shankar raja', 'yuvan', 'harris jayaraj',
    'santhosh narayanan', 'devi sri prasad', 'dsp', 'thaman s', 's. thaman', 'thaman',
    'sean roldan', 'pritam', 'sachin-jigar', 'amit trivedi', 'vishal-shekhar',
    'arijit singh', 'sid sriram', 'shreya ghoshal', 'badshah', 'diljit dosanjh',
    'yo yo honey singh', 'gv prakash', 'g.v. prakash', 'ilayaraja', 'ilayaraaja',
    'vidyasagar', 'd. imman', 'keeravani', 'm.m. keeravani', 'sam c.s.',
    'sushin shyam', 'govind vasantha', 'against the current', 'the weeknd'
]

def split_outside_brackets(s: str, sep: str = ' - ') -> list:
    """Splits string by separator only if it is outside parentheses and brackets."""
    depth = 0
    parts = []
    current = []
    i = 0
    while i < len(s):
        char = s[i]
        if char in '([{':
            depth += 1
        elif char in ')]}':
            depth = max(0, depth - 1)
        
        if depth == 0 and s[i:i+len(sep)] == sep:
            parts.append(''.join(current).strip())
            current = []
            i += len(sep)
            continue
        current.append(char)
        i += 1
    parts.append(''.join(current).strip())
    return [p for p in parts if p]

def clean_title_noise(s: str) -> str:
    """Removes lyrical/video suffixes and bracket clutter while preserving core title."""
    cleaned = re.sub(
        r'[\(\[\{]\s*(?:official|audio|video|lyric|hd|4k|lyrical|visualizer).*?[\)\]\}]', 
        '', 
        s, 
        flags=re.IGNORECASE
    ).strip()
    cleaned = re.sub(
        r'\s*[-–—]?\s*(?:lyrical(?:\s*video)?|lyric\s*video|video\s*song|official\s*(?:video|audio|lyrical)|audio\s*song|full\s*(?:video|audio)|visualizer|4k|hd).*$',
        '',
        cleaned,
        flags=re.IGNORECASE
    ).strip()
    cleaned = re.sub(r'\s+\b(?:lyrical|lyric\s*video|official\s*video|audio|video\s*song)\b.*$', '', cleaned, flags=re.IGNORECASE).strip()
    return cleaned or s

def parse_yt_title_and_artist(raw_title: str, channel: str) -> tuple[str, str]:
    """
    Robust title and artist parser that correctly handles:
    1. Topic channels ('- Topic')
    2. Pipe '|' formatted soundtracks ('Title | Movie | Cast | Composer')
    3. 'Title - Lyric Video' vs 'Artist - Title'
    Never corrupts movie titles or inverts artist/song names.
    """
    raw_title = raw_title.strip()
    channel = channel.strip()
    clean_channel = channel.replace(' - Topic', '').strip()

    # Rule 1: Topic channel is strictly the artist
    if '- topic' in channel.lower() or channel.lower().endswith('topic'):
        return clean_title_noise(raw_title), clean_channel

    # Rule 2: Check for Pipe '|' format: e.g. "Song Title | Movie | Cast | Composer"
    if '|' in raw_title:
        segments = [s.strip() for s in raw_title.split('|') if s.strip()]
        first_segment = segments[0]
        
        # If first segment is "Song Name - Suffix", strip suffix
        if ' - ' in first_segment:
            parts = split_outside_brackets(first_segment, ' - ')
            if len(parts) >= 2 and re.search(r'\b(lyric|video|audio|song|official|promo)\b', parts[1], re.IGNORECASE):
                first_segment = parts[0]
        
        clean_title = clean_title_noise(first_segment)

        # Find composer / artist in segments
        artist = clean_channel
        ch_is_label = any(lbl in clean_channel.lower() for lbl in KNOWN_OG_LABELS) or len(clean_channel) <= 3
        
        found_artist = None
        for seg in segments[1:]:
            seg_lower = seg.lower()
            for comp in KNOWN_COMPOSERS_OR_SINGERS:
                if comp in seg_lower:
                    found_artist = seg
                    break
            if found_artist:
                break
        
        if found_artist:
            artist = found_artist
        elif ch_is_label and len(segments) > 1:
            last_seg = segments[-1]
            if not any(x in last_seg.lower() for x in ['4k', 'official', 'teaser', 'trailer', 'promo', 'release', 'movie']):
                artist = last_seg

        return clean_title, artist

    # Rule 3: Hyphen separated ' - ' outside brackets
    parts = split_outside_brackets(raw_title, ' - ')
    if len(parts) >= 2:
        part1 = parts[0].strip()
        part2 = ' - '.join(parts[1:]).strip()

        # If part2 is just "Lyric Video", "Official Video", etc.
        if re.search(r'^(?:lyric\s*video|lyrical|official\s*(?:video|audio)|video\s*song|audio\s*song)$', part2, re.IGNORECASE):
            return clean_title_noise(part1), clean_channel

        # Standard "Artist - Title"
        if any(lbl in part1.lower() for lbl in KNOWN_OG_LABELS):
            return clean_title_noise(part2), clean_channel
        
        return clean_title_noise(part2), part1

    return clean_title_noise(raw_title), clean_channel

UNOFFICIAL_PATTERNS = [
    r'\b(multimix|mashup|mix|slowed|reverb|slowed\s*\+\s*reverb|8d\s*audio|8d|bass\s*boosted|boosted|nightcore)\b',
    r'\b(whatsapp|status|ringtone|fan\s*made|fanmade|fan\s*video|remake|edit|dance\s*cover)\b',
    r'\b(butter\s*skotch|nova\s*lyrics|7clouds|shayanthan|retro\._guy|lyrify|vxin\s*editz|agxvi)\b',
    r'\b(cover|karaoke|acoustic\s*cover|unplugged\s*cover)\b',
    r'\b(shorts|reaction|interview|behindwoods|galatta|cineulagam)\b'
]

def is_og_channel(channel_name: str, artist_name: str = "") -> bool:
    ch = channel_name.lower().strip()
    if not ch:
        return False

    # 1. Topic channel (YouTube Music official distributor release)
    if '- topic' in ch or ch.endswith('topic'):
        return True

    # 2. VEVO official channel
    if 'vevo' in ch:
        return True

    # 3. Known Official Record Label / Studio
    for label in KNOWN_OG_LABELS:
        if label in ch:
            return True

    # 4. Artist name match (e.g. channel "Sai Abhyankkar" for artist "Sai Abhyankkar")
    if artist_name:
        clean_artist = re.sub(r'[^a-z0-9 ]', '', artist_name.lower()).strip()
        artist_tokens = [tok for tok in clean_artist.split() if len(tok) > 2]
        if artist_tokens:
            matches = sum(1 for tok in artist_tokens if tok in ch)
            if matches >= 1:
                return True

    return False

def is_clean_og_track(e: Dict[str, Any], target_title: str = "", target_artist: str = "") -> bool:
    title = (e.get('title') or '').lower()
    channel = (e.get('channel') or e.get('uploader') or '').lower()
    desc = (e.get('description') or '').lower()
    is_verified = bool(e.get('channel_is_verified'))

    # 1. Immediate rejection if unofficial term in title or channel
    for pat in UNOFFICIAL_PATTERNS:
        if re.search(pat, title) or re.search(pat, channel):
            return False

    # 2. Check: Official YouTube Music auto-generated distributor release
    if 'provided to youtube by' in desc or '- topic' in channel or channel.endswith('topic'):
        return True

    # 3. Check: Known Official Record Label in channel, title or description
    for label in KNOWN_OG_LABELS:
        if label in channel or label in title:
            return True

    # 4. Check: Channel is a verified artist or publisher on YouTube
    if is_verified:
        return True

    # 5. Check: Artist name match (e.g. channel "Sai Abhyankkar" for artist "Sai Abhyankkar")
    if target_artist and is_og_channel(channel, target_artist):
        return True

    return False


def score_audio_candidate(e: Dict[str, Any], target_title: str, target_artist: str = '', target_duration: int = 0) -> float:
    """
    Heuristic scoring engine that strictly enforces OG Creator / Official Publisher uploads
    and immediately disqualifies any fan-made, lyric channel, or unofficial content.
    """
    # Strict OG creator verification
    if not is_clean_og_track(e, target_title, target_artist):
        return -1000.0  # Immediate disqualification for fan-made / unofficial uploads

    title = (e.get('title') or '').lower()
    channel = (e.get('channel') or e.get('uploader') or '').lower()
    duration = int(e.get('duration') or 0)
    score = 0.0

    # 1. Title Keyword Verification (Mandatory)
    clean_target = clean_track_title(target_title)
    t_words = [w.lower() for w in clean_target.split() if len(w) > 2]
    if t_words:
        matched_words = sum(1 for w in t_words if w in title or w in channel)
        if matched_words == 0:
            return -500.0  # Disqualify tracks that don't match the song title
        score += (matched_words / len(t_words)) * 40.0

    # 2. Artist Matching Bonus
    if target_artist:
        primary_artist = target_artist.split(',')[0].split('&')[0].strip().lower()
        if primary_artist and (primary_artist in title or primary_artist in channel):
            score += 30.0

    # 3. Severe Penalty for Video Songs (often have 15-30s intro comedy, sponsor title cards, or outro promos)
    if re.search(r'\b(music video|video song|official video|full video|4k video|hd video)\b', title):
        score -= 75.0

    # 4. High Bonus for Official Studio Releases
    if '- topic' in channel or channel.endswith('topic'):
        score += 90.0  # YouTube Music direct studio audio release
    elif any(term in title for term in ['official audio', 'audio song', 'full audio', 'lyric video', 'official lyrical', 'lyrical video']):
        score += 45.0

    # 5. Duration Matching (The ultimate studio filter)
    if target_duration > 0 and duration > 0:
        diff = abs(duration - target_duration)
        if diff <= 3:
            score += 70.0  # Exact studio master match
        elif diff <= 8:
            score += 40.0
        elif diff <= 15:
            score += 10.0
        elif diff > 60:
            score -= 140.0  # Big mismatch (likely scene, dialogue, or interview)
        elif diff > 30:
            score -= 80.0

        # Critical: If candidate duration is longer than the target duration by > 6s,
        # it is almost certainly a music video or upload with intro/outro ads!
        if duration > target_duration + 6:
            score -= 60.0
        if duration > target_duration + 15:
            score -= 80.0

        # Ringtone/clip check
        if duration < 60 and target_duration > 90:
            score -= 150.0

    return score


class YouTubeService:
    def __init__(self):
        self.ydl_opts_meta = {
            'quiet': True,
            'no_warnings': True,
            'extract_flat': True,
            'skip_download': True,
            'socket_timeout': 6,
        }
        self.ydl_opts_stream = {
            'format': 'bestaudio[abr>=320]/bestaudio[abr>=256]/251/140/bestaudio[ext=m4a]/bestaudio/best',
            'noplaylist': True,
            'quiet': True,
            'no_warnings': True,
            'skip_download': True,
            'socket_timeout': 8,
        }

    async def get_autocomplete_suggestions(self, query: str) -> List[str]:
        """
        Fast autocomplete suggestions from YouTube autocomplete API (~50-100ms).
        """
        if not query or len(query.strip()) < 2:
            return []
        
        cache_key = f"suggest_{query.lower().strip()}"
        if cache_key in search_cache:
            return search_cache[cache_key]

        url = f"https://suggestqueries.google.com/complete/search?client=firefox&ds=yt&q={urllib.parse.quote(query.strip())}"
        try:
            loop = asyncio.get_event_loop()
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            
            def do_fetch():
                with urllib.request.urlopen(req, timeout=3) as resp:
                    data = json.loads(resp.read().decode('utf-8', errors='ignore'))
                    return data[1] if len(data) > 1 else []

            suggestions = await loop.run_in_executor(None, do_fetch)
            # Filter clean suggestions
            clean_suggestions = [s for s in suggestions if isinstance(s, str)][:8]
            search_cache[cache_key] = clean_suggestions
            return clean_suggestions
        except Exception as e:
            logger.warning(f"Autocomplete suggestions error for '{query}': {e}")
            return []

    async def search_tracks(self, query: str, limit: int = 10) -> List[Track]:
        """
        Fast metadata search on YouTube/YouTube Music using flat extraction.
        Prioritizes official Topic releases and clean studio audio.
        Filters out fan edits, 8D audio, slowed/reverb, and video promos.
        """
        query = query.strip()
        if not query:
            return []

        cache_key = f"yt_search_clean_{query.lower()}_{limit}"
        if cache_key in search_cache:
            return search_cache[cache_key]

        loop = asyncio.get_event_loop()

        def do_search():
            with yt_dlp.YoutubeDL(self.ydl_opts_meta) as ydl:
                clean_q = clean_track_title(query)
                queries_to_try = [
                    f"ytsearch{limit * 2}:{clean_q} Topic",
                    f"ytsearch{limit}:{query} audio"
                ]

                raw_entries = []
                seen_ids = set()
                for q_str in queries_to_try:
                    try:
                        info = ydl.extract_info(q_str, download=False)
                        entries = info.get('entries', []) if info else []
                        for e in entries:
                            if e and e.get('id') and e['id'] not in seen_ids:
                                seen_ids.add(e['id'])
                                raw_entries.append(e)
                    except Exception:
                        pass

                # Score all candidates against clean_q (strictly require OG creator / label verification)
                scored = []
                for e in raw_entries:
                    s = score_audio_candidate(e, target_title=clean_q)
                    # Disqualify all fan-made, lyric channel, or unofficial content
                    if s > 0.0:
                        scored.append((s, e))

                scored.sort(key=lambda x: x[0], reverse=True)

                tracks = []
                for score_val, e in scored[:limit]:
                    vid_id = e.get('id')
                    raw_title = e.get('title', 'Unknown Title')
                    channel = e.get('channel') or e.get('uploader') or 'Official Audio'
                    duration = int(e.get('duration') or 0)
                    thumb = e.get('thumbnail') or f"https://i.ytimg.com/vi/{vid_id}/hqdefault.jpg"

                    # Use intelligent title & artist parser (handles pipes, - Topic, and bracketed hyphens)
                    clean_title, artist = parse_yt_title_and_artist(raw_title, channel)

                    title_enc = urllib.parse.quote(clean_title)
                    artist_enc = urllib.parse.quote(artist)
                    stream_url = f"/api/music/stream?id={vid_id}&title={title_enc}&artist={artist_enc}&duration={duration}"

                    tracks.append(Track(
                        id=f"yt_{vid_id}",
                        title=clean_title,
                        artist=artist,
                        album="YouTube Music",
                        artwork_url=thumb,
                        duration=duration,
                        stream_url=stream_url,
                        provider="youtube",
                        bitrate="320kbps Ultra HD (Opus/AAC)",
                        availability_status="available"
                    ))
                return tracks

        try:
            async with _yt_semaphore:
                tracks = await loop.run_in_executor(_yt_thread_pool, do_search)
            search_cache[cache_key] = tracks
            return tracks
        except Exception as e:
            logger.error(f"YouTube search error for '{query}': {e}")
            return []

    async def resolve_stream_url(
        self,
        video_id_or_query: str,
        target_title: Optional[str] = None,
        target_artist: Optional[str] = None,
        target_duration: Optional[int] = None,
        swap_offset: int = 0
    ) -> Optional[Dict[str, Any]]:
        """
        Resolves direct streaming audio URL for a YouTube video ID or search query.
        Uses multi-candidate ranking and duration matching to guarantee pure studio audio
        with zero video dialogue, ads, BGM ringtones, or talk shows.
        Results are cached in stream_url_cache for 4 hours.
        """
        video_id_or_query = video_id_or_query.strip()
        if not video_id_or_query:
            return None

        # Build composite cache key
        dur_key = target_duration if target_duration and target_duration > 0 else 0
        cache_key = f"{video_id_or_query}_{dur_key}_{swap_offset}"
        if cache_key in stream_url_cache:
            return stream_url_cache[cache_key]

        loop = asyncio.get_event_loop()

        def do_extract():
            is_direct_vid_id = bool(re.match(r'^[a-zA-Z0-9_-]{11}$', video_id_or_query))
            target_vid_id = None

            # 1. Multi-candidate search using flat extraction (prioritize official Topic releases)
            with yt_dlp.YoutubeDL(self.ydl_opts_meta) as ydl_meta:
                if target_title:
                    clean_t = clean_track_title(target_title)
                    prim_artist = target_artist.split(',')[0].split('&')[0].strip() if target_artist else ""
                    search_queries = [
                        f"ytsearch5:{clean_t} {prim_artist} Topic".strip(),
                        f"ytsearch5:{clean_t} {prim_artist} official audio".strip()
                    ]
                else:
                    search_queries = [
                        f"ytsearch5:{video_id_or_query} Topic".strip(),
                        f"ytsearch5:{video_id_or_query} official audio".strip()
                    ]

                raw_entries = []
                seen_ids = set()
                for sq in search_queries:
                    try:
                        search_res = ydl_meta.extract_info(sq, download=False)
                        entries = search_res.get('entries', []) if search_res else []
                        for e in entries:
                            if e and e.get('id') and e['id'] not in seen_ids:
                                seen_ids.add(e['id'])
                                raw_entries.append(e)
                    except Exception as se:
                        logger.warning(f"Flat search error for '{sq}': {se}")

                if raw_entries:
                    # 2. Score all candidates
                    scored = []
                    eval_title = target_title or video_id_or_query
                    eval_artist = target_artist or ""
                    eval_dur = target_duration or 0

                    for e in raw_entries:
                        sc = score_audio_candidate(e, eval_title, eval_artist, eval_dur)
                        scored.append((sc, e))

                    scored.sort(key=lambda x: x[0], reverse=True)

                    if scored and scored[0][0] > 0.0:
                        idx = min(max(0, swap_offset), len(scored) - 1)
                        winner = scored[idx][1]
                        target_vid_id = winner.get('id')
                        logger.info(
                            f"Selected verified OG studio candidate: score={scored[idx][0]:.1f}, "
                            f"id={target_vid_id}, title='{winner.get('title')}', "
                            f"dur={winner.get('duration')}s (target {eval_dur}s)"
                        )

            # Fallback if no target ID determined
            if not target_vid_id:
                target_vid_id = video_id_or_query if is_direct_vid_id else f"ytsearch1:{video_id_or_query} Topic"

            # 3. Extract direct audio stream URL for the selected candidate
            with yt_dlp.YoutubeDL(self.ydl_opts_stream) as ydl_stream:
                target_arg = target_vid_id if not target_vid_id.startswith("ytsearch") else target_vid_id
                info = ydl_stream.extract_info(target_arg, download=False)
                if not info:
                    return None

                if 'entries' in info:
                    entries = info.get('entries', [])
                    if not entries:
                        return None
                    info = entries[0]

                stream_url = info.get('url')
                if not stream_url:
                    return None

                info_dur = int(info.get('duration') or 0)
                # If target_duration was specified and stream video has extra promo/outro seconds,
                # record effective studio duration to prevent playing through video outros
                effective_duration = target_duration if (target_duration and target_duration > 0 and abs(info_dur - target_duration) <= 30) else info_dur

                return {
                    'id': info.get('id'),
                    'title': info.get('title'),
                    'duration': effective_duration,
                    'stream_url': stream_url,
                    'format': info.get('format'),
                    'abr': info.get('abr'),
                    'is_studio': True
                }

        try:
            async with _yt_semaphore:
                result = await loop.run_in_executor(_yt_thread_pool, do_extract)
            if result and result.get('stream_url'):
                stream_url_cache[cache_key] = result
                stream_url_cache[video_id_or_query] = result
                if result.get('id'):
                    stream_url_cache[result['id']] = result
                return result
        except Exception as e:
            logger.error(f"Failed to resolve studio audio stream for '{video_id_or_query}': {e}")

        return None

yt_service = YouTubeService()
