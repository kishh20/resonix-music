import random
import logging
import asyncio
from typing import List, Dict, Set, Optional
from app.models.music import Track, RecommendationRequest, RecommendationMix, RecommendationResponse
from app.services.unified_music_service import unified_music_service
from cachetools import TTLCache

logger = logging.getLogger(__name__)
# Short-lived TTL cache (60s) for nonces to prevent duplicate bursts while allowing fast dynamic refresh
cache = TTLCache(maxsize=150, ttl=60)

MIX_COVERS = {
    'daily': [
        "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80"
    ],
    'spotlight': [
        "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=500&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=500&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=500&auto=format&fit=crop&q=80"
    ],
    'chill': [
        "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=500&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=500&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=500&auto=format&fit=crop&q=80"
    ],
    'region': [
        "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=500&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1483412033650-1015ddeb83d1?w=500&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=500&auto=format&fit=crop&q=80"
    ]
}

class RecommendationService:
    async def get_personalized_recommendations(self, req: RecommendationRequest) -> RecommendationResponse:
        """
        Dynamically generates personalized recommendations and mixes tailored to the user's
        taste preferences (Artists, Languages, Genres, Region).
        
        On every refresh or login, dynamically rotates the featured artists, languages,
        and mixes so the user discovers fresh songs rather than static duplicate cards.
        """
        # If force_refresh or refresh_nonce is passed, bypass cache for instant fresh suggestions
        nonce = req.refresh_nonce or ""
        if not req.force_refresh and not nonce:
            artists_key = '-'.join(sorted([a.lower() for a in (req.favorite_artists or [])[:4]]))
            genres_key = '-'.join(sorted([g.lower() for g in (req.preferred_genres or [])[:4]]))
            langs_key = '-'.join(sorted([l.lower() for l in (req.preferred_languages or [])[:3]]))
            region_key = (req.region or '').lower()
            cache_key = f"recs_{artists_key}_{genres_key}_{langs_key}_{region_key}_{req.limit}"
            if cache_key in cache:
                return cache[cache_key]

        artist_tracks: List[Track] = []
        language_tracks: List[Track] = []
        region_tracks: List[Track] = []
        genre_tracks: List[Track] = []

        # 1. Dynamically sample & rotate favorite artists
        chosen_artists = []
        if req.favorite_artists:
            # If user has multiple artists, shuffle/rotate so different artists get featured on each refresh
            shuffled_artists = list(req.favorite_artists)
            random.shuffle(shuffled_artists)
            chosen_artists = shuffled_artists[:4]

            async def fetch_artist_tracks(artist_name: str) -> List[Track]:
                try:
                    # Alternating search modifiers to discover diverse tracks (hits, best songs, essentials)
                    query_variants = [artist_name, f"{artist_name} hits", f"{artist_name} essentials", f"best of {artist_name}"]
                    q = random.choice(query_variants)
                    res = await unified_music_service.search(query=q, limit=8)
                    return res.tracks or []
                except Exception as e:
                    logger.debug(f"Error fetching tracks for artist {artist_name}: {e}")
                    return []

            tasks = [fetch_artist_tracks(a) for a in chosen_artists]
            results = await asyncio.gather(*tasks, return_exceptions=True)
            for r in results:
                if isinstance(r, list):
                    artist_tracks.extend(r)

        # 2. Dynamically sample & rotate preferred languages
        chosen_languages = []
        if req.preferred_languages:
            shuffled_langs = list(req.preferred_languages)
            random.shuffle(shuffled_langs)
            chosen_languages = shuffled_langs[:3]

            async def fetch_lang_tracks(lang: str) -> List[Track]:
                try:
                    variants = [f"{lang} hits", f"{lang} chartbusters", f"{lang} viral melodies", f"{lang} top tracks"]
                    q = random.choice(variants)
                    res = await unified_music_service.search(query=q, limit=8)
                    return res.tracks or []
                except Exception as e:
                    logger.debug(f"Error fetching tracks for language {lang}: {e}")
                    return []

            tasks = [fetch_lang_tracks(l) for l in chosen_languages]
            results = await asyncio.gather(*tasks, return_exceptions=True)
            for r in results:
                if isinstance(r, list):
                    language_tracks.extend(r)

        # 3. Regional hits
        if req.region and req.region.lower() not in ["global", "worldwide"]:
            try:
                reg_variants = [f"Top hits {req.region}", f"Trending songs {req.region}", f"Viral hits {req.region}"]
                reg_res = await unified_music_service.search(query=random.choice(reg_variants), limit=10)
                region_tracks = reg_res.tracks or []
            except Exception as e:
                logger.debug(f"Error fetching regional tracks for {req.region}: {e}")

        # 4. Fetch general trending pool as baseline candidates
        base_candidates = await unified_music_service.get_trending(limit=30)

        # Deduplicate all candidates by track ID / title+artist
        seen_ids: Set[str] = set()
        seen_signatures: Set[str] = set()
        all_candidates: List[Track] = []

        def add_unique(track: Track):
            sig = f"{track.title.lower().strip()}-{track.artist.lower().strip()}"
            if track.id not in seen_ids and sig not in seen_signatures:
                seen_ids.add(track.id)
                seen_signatures.add(sig)
                all_candidates.append(track)

        # Prioritize artist tracks, then language/regional, then base candidates
        # Shuffle subsets slightly to avoid static front-loaded tracks
        if artist_tracks:
            random.shuffle(artist_tracks)
            for t in artist_tracks:
                add_unique(t)

        if language_tracks:
            random.shuffle(language_tracks)
            for t in language_tracks:
                add_unique(t)

        if region_tracks:
            for t in region_tracks:
                add_unique(t)

        if base_candidates:
            for t in base_candidates:
                add_unique(t)

        # Filter out liked tracks to provide fresh recommendations
        unliked = [t for t in all_candidates if t.id not in req.liked_track_ids]
        if not unliked:
            unliked = all_candidates

        # Personalized list blends top preferences first
        personalized = unliked[:req.limit]

        # 5. Build dynamic personalized mixes with fresh titles & artwork
        mixes: List[RecommendationMix] = []

        # Mix 1: Daily Discovery
        daily_tracks = []
        if artist_tracks:
            daily_tracks.extend(artist_tracks[:4])
        if language_tracks:
            daily_tracks.extend(language_tracks[:4])
        remaining = [t for t in unliked if t not in daily_tracks]
        daily_tracks.extend(remaining[:8])
        random.shuffle(daily_tracks)

        mixes.append(
            RecommendationMix(
                id="mix-daily",
                title="Daily Discovery",
                description="Your fresh rotating daily mix tailored to your artists, languages & vibes.",
                cover_url=random.choice(MIX_COVERS['daily']),
                tracks=daily_tracks[:14] if daily_tracks else unliked[:12]
            )
        )

        # Mix 2: Rotating Artist Spotlight
        spotlight_artist = chosen_artists[0] if chosen_artists else (req.favorite_artists[0] if req.favorite_artists else None)
        if spotlight_artist and artist_tracks:
            artist_specific = [t for t in artist_tracks if spotlight_artist.lower() in t.artist.lower()]
            mix_tracks = artist_specific[:10] if len(artist_specific) >= 3 else artist_tracks[:10]
            mixes.append(
                RecommendationMix(
                    id="mix-artist-spotlight",
                    title=f"Spotlight: {spotlight_artist}",
                    description=f"Essential anthems and finest recordings by {spotlight_artist}.",
                    cover_url=random.choice(MIX_COVERS['spotlight']),
                    tracks=mix_tracks
                )
            )
        else:
            chill_tracks = [t for t in unliked if (t.genre or "").lower() in ["lofi", "ambient", "acoustic", "pop"]]
            mixes.append(
                RecommendationMix(
                    id="mix-chill",
                    title="Lo-Fi & Deep Focus",
                    description="Mellow rhythms and soothing beats to stay in the flow.",
                    cover_url=random.choice(MIX_COVERS['chill']),
                    tracks=chill_tracks[:10] if len(chill_tracks) >= 4 else unliked[4:14]
                )
            )

        # Mix 3: Rotating Regional / Language Shelf
        featured_lang = chosen_languages[0] if chosen_languages else (req.preferred_languages[0] if req.preferred_languages else None)
        if featured_lang and language_tracks:
            mixes.append(
                RecommendationMix(
                    id="mix-language",
                    title=f"{featured_lang} Superhits",
                    description=f"Top streamed melodies, chartbusters and new releases in {featured_lang}.",
                    cover_url=random.choice(MIX_COVERS['region']),
                    tracks=language_tracks[:12]
                )
            )
        elif req.region and region_tracks:
            mixes.append(
                RecommendationMix(
                    id="mix-region",
                    title=f"Trending in {req.region}",
                    description=f"The most streamed sounds and viral anthems in {req.region}.",
                    cover_url=random.choice(MIX_COVERS['region']),
                    tracks=region_tracks[:12]
                )
            )
        else:
            mixes.append(
                RecommendationMix(
                    id="mix-energy",
                    title="Electronic Surge",
                    description="High tempo beats and club anthems to boost your energy.",
                    cover_url=random.choice(MIX_COVERS['daily']),
                    tracks=[t for t in unliked if (t.genre or "").lower() in ["electronic", "edm", "dance"]][:10] or unliked[8:18]
                )
            )

        # Mix 4: Sonic Explorations / Release Radar
        radar_pool = unliked[12:] if len(unliked) > 20 else unliked
        shuffled_radar = list(radar_pool)
        random.shuffle(shuffled_radar)
        mixes.append(
            RecommendationMix(
                id="mix-radar",
                title="Fresh Discoveries",
                description="Exciting new drops and indie gems you haven't heard yet.",
                cover_url=random.choice(MIX_COVERS['chill']),
                tracks=shuffled_radar[:12] if shuffled_radar else unliked[:10]
            )
        )

        resp = RecommendationResponse(
            personalized_tracks=personalized,
            mixes=mixes
        )
        return resp

recommendation_service = RecommendationService()
