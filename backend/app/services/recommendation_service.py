import random
import logging
import asyncio
from typing import List, Dict, Set
from app.models.music import Track, RecommendationRequest, RecommendationMix, RecommendationResponse
from app.services.unified_music_service import unified_music_service
from cachetools import TTLCache

logger = logging.getLogger(__name__)
cache = TTLCache(maxsize=100, ttl=600)

class RecommendationService:
    async def get_personalized_recommendations(self, req: RecommendationRequest) -> RecommendationResponse:
        # Cache key based on artists, genres, languages, and region
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

        # 1. Fetch tracks for favorite artists in parallel
        if req.favorite_artists:
            async def fetch_artist_tracks(artist_name: str) -> List[Track]:
                try:
                    res = await unified_music_service.search(query=artist_name, limit=6)
                    return res.tracks or []
                except Exception as e:
                    logger.debug(f"Error fetching tracks for artist {artist_name}: {e}")
                    return []

            tasks = [fetch_artist_tracks(a) for a in req.favorite_artists[:4]]
            results = await asyncio.gather(*tasks, return_exceptions=True)
            for r in results:
                if isinstance(r, list):
                    artist_tracks.extend(r)

        # 2. Fetch tracks for preferred languages in parallel
        if req.preferred_languages:
            async def fetch_lang_tracks(lang: str) -> List[Track]:
                try:
                    res = await unified_music_service.search(query=f"{lang} hits", limit=8)
                    return res.tracks or []
                except Exception as e:
                    logger.debug(f"Error fetching tracks for language {lang}: {e}")
                    return []

            tasks = [fetch_lang_tracks(l) for l in req.preferred_languages[:3]]
            results = await asyncio.gather(*tasks, return_exceptions=True)
            for r in results:
                if isinstance(r, list):
                    language_tracks.extend(r)

        # 3. Fetch regional hits if specified
        if req.region and req.region.lower() not in ["global", "worldwide"]:
            try:
                reg_res = await unified_music_service.search(query=f"Top hits {req.region}", limit=10)
                region_tracks = reg_res.tracks or []
            except Exception as e:
                logger.debug(f"Error fetching regional tracks for {req.region}: {e}")

        # 4. Fetch general trending pool as baseline candidates
        base_candidates = await unified_music_service.get_trending(limit=40)

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
        for t in artist_tracks:
            add_unique(t)
        for t in language_tracks:
            add_unique(t)
        for t in region_tracks:
            add_unique(t)
        for t in base_candidates:
            add_unique(t)

        # Filter out liked tracks to provide fresh recommendations
        unliked = [t for t in all_candidates if t.id not in req.liked_track_ids]
        if not unliked:
            unliked = all_candidates

        # Personalized list blends top preferences first
        personalized = unliked[:req.limit]

        # 5. Build dynamic personalized mixes
        mixes: List[RecommendationMix] = []

        # Mix 1: Daily Discovery (Tailored blend)
        daily_tracks = []
        if artist_tracks:
            daily_tracks.extend(artist_tracks[:4])
        if language_tracks:
            daily_tracks.extend(language_tracks[:4])
        daily_tracks.extend([t for t in unliked if t not in daily_tracks][:8])
        mixes.append(
            RecommendationMix(
                id="mix-daily",
                title="Daily Discovery",
                description="Your personalized daily mix based on your favorite artists, languages & vibes.",
                cover_url="https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=80",
                tracks=daily_tracks[:14] if daily_tracks else unliked[:12]
            )
        )

        # Mix 2: Artist Spotlight or Chill Focus
        if req.favorite_artists and len(artist_tracks) >= 4:
            top_artist = req.favorite_artists[0]
            mixes.append(
                RecommendationMix(
                    id="mix-artist-spotlight",
                    title=f"Spotlight: {top_artist}",
                    description=f"Essential tracks by {top_artist} and similar sounds.",
                    cover_url="https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80",
                    tracks=[t for t in artist_tracks if top_artist.lower() in t.artist.lower()][:10] or artist_tracks[:10]
                )
            )
        else:
            mixes.append(
                RecommendationMix(
                    id="mix-chill",
                    title="Lo-Fi & Deep Focus",
                    description="Mellow rhythms and soothing beats to stay in the zone.",
                    cover_url="https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=500&auto=format&fit=crop&q=80",
                    tracks=[t for t in unliked if (t.genre or "").lower() in ["lofi", "ambient", "acoustic"]][:10] or unliked[5:15]
                )
            )

        # Mix 3: Regional Mix or Global Chartbusters
        if req.region and region_tracks:
            mixes.append(
                RecommendationMix(
                    id="mix-region",
                    title=f"Top Hits {req.region}",
                    description=f"What people are listening to in {req.region}.",
                    cover_url="https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&auto=format&fit=crop&q=80",
                    tracks=region_tracks[:12]
                )
            )
        elif req.preferred_languages and language_tracks:
            top_lang = req.preferred_languages[0]
            mixes.append(
                RecommendationMix(
                    id="mix-language",
                    title=f"{top_lang} Hits & Melodies",
                    description=f"Curated collection of top {top_lang} recordings.",
                    cover_url="https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=500&auto=format&fit=crop&q=80",
                    tracks=language_tracks[:12]
                )
            )
        else:
            mixes.append(
                RecommendationMix(
                    id="mix-energy",
                    title="Electronic Surge",
                    description="High tempo beats and club anthems to boost your energy.",
                    cover_url="https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&auto=format&fit=crop&q=80",
                    tracks=[t for t in unliked if (t.genre or "").lower() in ["electronic", "edm", "dance"]][:10] or unliked[10:20]
                )
            )

        # Mix 4: Release Radar
        mixes.append(
            RecommendationMix(
                id="mix-radar",
                title="Release Radar",
                description="Fresh indie tracks and emerging creators across the globe.",
                cover_url="https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80",
                tracks=unliked[15:25] if len(unliked) >= 25 else unliked[:10]
            )
        )

        resp = RecommendationResponse(
            personalized_tracks=personalized,
            mixes=mixes
        )
        cache[cache_key] = resp
        return resp

recommendation_service = RecommendationService()
