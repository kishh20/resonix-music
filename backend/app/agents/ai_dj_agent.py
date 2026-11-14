import os
import re
import json
import random
import logging
import asyncio
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
import httpx

from app.models.music import Track
from app.services.unified_music_service import unified_music_service
from app.services.discovery_service import discovery_service

logger = logging.getLogger(__name__)

class AIDJRequest(BaseModel):
    prompt: str
    user_name: Optional[str] = "Listener"
    favorite_artists: List[str] = []
    preferred_languages: List[str] = []
    preferred_genres: List[str] = []
    region: Optional[str] = None
    current_track: Optional[Track] = None
    recent_track_ids: List[str] = []

class AIDJResponse(BaseModel):
    dj_name: str = "DJ Resonix"
    vibe_title: str
    energy_level: str
    dj_commentary: str
    suggested_queries: List[str] = []
    tracks: List[Track] = []

VIBE_PRESETS = [
    {
        "keywords": ["midnight", "night", "dark", "late", "moon", "city", "neon", "drive"],
        "title": "Neon Midnight Cruise",
        "energy": "Moody & Atmospheric",
        "commentary_templates": [
            "Dialing down the lights. I've locked in some smooth, late-night atmospheric vibes with lush synth baselines and moody vocals. Sit back and enjoy the ride.",
            "Midnight frequencies loaded. We're cutting through the silence with smooth late-night grooves and immersive soundscapes."
        ],
        "default_queries": ["late night lofi", "synthwave midnight drive", "the weeknd moody", "atmospheric r&b"]
    },
    {
        "keywords": ["gym", "workout", "pump", "energy", "heavy", "beast", "run", "cardio", "hype"],
        "title": "Hyperdrive Cardio Rush",
        "energy": "High Intensity (140+ BPM)",
        "commentary_templates": [
            "Time to turn the adrenaline up to 100! Here's a heavy-hitting setlist with relentless basslines, high tempo drops, and pure motivation. Let's get it!",
            "Maximum energy engaged. Dropping high-BPM anthems and punchy bass kicks to power through your sets."
        ],
        "default_queries": ["workout edm hits", "hype trap rap", "hardstyle bass drops", "high energy gym playlist"]
    },
    {
        "keywords": ["study", "focus", "work", "code", "coding", "read", "chill", "calm", "relax"],
        "title": "Deep Flow & Lo-Fi Session",
        "energy": "Mellow & Focused",
        "commentary_templates": [
            "Entering deep focus mode. Keeping the BPM gentle and the melodies warm with soothing Lo-Fi beats, soft keys, and zero distractions.",
            "Clear your mind and settle into the flow. Here is a curated ambient sequence crafted to keep your thoughts sharp and steady."
        ],
        "default_queries": ["lofi hip hop study beats", "ambient deep focus", "chillhop beats to study", "calm piano instrumental"]
    },
    {
        "keywords": ["party", "dance", "club", "weekend", "celebrate", "friday", "banger"],
        "title": "Peak Time Floor Shakers",
        "energy": "Electric & Explosive",
        "commentary_templates": [
            "The weekend starts right now. I'm spinning wall-to-wall club chartbusters, dance anthems, and festival drops. Volume up!",
            "Unleashing the dancefloor energy. Big drops, unforgettable hooks, and heavy grooves lined up for your session."
        ],
        "default_queries": ["dance club chartbusters", "electronic festival hits", "party pop anthems", "house bangers"]
    },
    {
        "keywords": ["nostalgia", "90s", "2000s", "retro", "throwback", "classic", "old"],
        "title": "Golden Era Time Machine",
        "energy": "Warm Nostalgia",
        "commentary_templates": [
            "Taking a trip down memory lane! Pulling out iconic timeless anthems and unforgettable vintage hooks that never get old.",
            "Throwback rewind engaged. Here's a set of classics that defined generations. Pure memories in every chord."
        ],
        "default_queries": ["2000s pop essentials", "90s timeless hits", "retro classics radio", "golden era melodies"]
    },
    {
        "keywords": ["rain", "sad", "heartbreak", "cry", "lonely", "emotional", "acoustic"],
        "title": "Raindrops & Melancholy",
        "energy": "Introspective & Gentle",
        "commentary_templates": [
            "For the quiet, reflective moments. Handpicked acoustic guitars, gentle piano chords, and soul-stirring vocal melodies.",
            "Sometimes the soul just needs honest music. Here are some heartfelt melodies to accompany your thoughts."
        ],
        "default_queries": ["acoustic melancholy songs", "sad piano ballad", "emotional acoustic vocal", "rainy day chill"]
    }
]

class AIDJAgent:
    """
    Autonomous In-App AI DJ Agent.
    Interprets natural language prompts, incorporates user taste preferences,
    and curates personalized multi-track DJ sets with authentic spoken/text commentary.
    """
    def __init__(self):
        self.name = "DJ Resonix"
        self.gemini_api_key = os.getenv("GEMINI_API_KEY", "")

    async def _generate_with_gemini(self, req: AIDJRequest) -> Optional[Dict[str, Any]]:
        """Invokes Gemini 2.5 Flash / Flash Lite for conversational DJ reasoning if API key is present."""
        if not self.gemini_api_key:
            return None

        prompt_text = f"""
You are DJ Resonix, an ultra-cool, charismatic, music-obsessed AI DJ on the Resonix Music high-fidelity streaming platform.
A user named '{req.user_name}' says: "{req.prompt}".

Their Taste Profile:
- Favorite Artists: {', '.join(req.favorite_artists) if req.favorite_artists else 'Eclectic'}
- Preferred Languages: {', '.join(req.preferred_languages) if req.preferred_languages else 'Global'}
- Preferred Genres: {', '.join(req.preferred_genres) if req.preferred_genres else 'Pop / Electronic'}
- Region: {req.region or 'Global'}
- Currently Playing: {req.current_track.title + ' by ' + req.current_track.artist if req.current_track else 'Silence'}

Respond with ONLY a JSON object formatted exactly as:
{{
  "vibe_title": "Creative 3-5 word Title for the Vibe",
  "energy_level": "e.g. Medium Chill / High Energy (130 BPM) / Late Night Ambient",
  "dj_commentary": "A friendly, hype, charismatic 2-3 sentence DJ voice intro addressing the user, mentioning 1 or 2 artists or vibes, and setting the tone.",
  "search_queries": ["Search query 1", "Search query 2", "Search query 3", "Search query 4"]
}}
"""
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={self.gemini_api_key}"
        headers = {"Content-Type": "application/json"}
        payload = {
            "contents": [{"parts": [{"text": prompt_text}]}],
            "generationConfig": {"temperature": 0.7, "maxOutputTokens": 800}
        }

        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                res = await client.post(url, headers=headers, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    candidates = data.get("candidates", [])
                    if candidates:
                        raw_text = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                        match = re.search(r'\{.*\}', raw_text, re.DOTALL)
                        if match:
                            return json.loads(match.group(0))
        except Exception as e:
            logger.debug(f"Gemini AI DJ generation failed, falling back to local heuristic: {e}")

        return None

    def _fallback_vibe_reasoning(self, req: AIDJRequest) -> Dict[str, Any]:
        """Intelligent semantic vibe planner when cloud AI API is offline."""
        prompt_lower = req.prompt.lower()
        matched_preset = None

        for preset in VIBE_PRESETS:
            if any(k in prompt_lower for k in preset["keywords"]):
                matched_preset = preset
                break

        # Blend user's favorite artist & languages into the queries
        artist_seed = random.choice(req.favorite_artists) if req.favorite_artists else ""
        lang_seed = random.choice(req.preferred_languages) if req.preferred_languages else ""

        if matched_preset:
            vibe_title = matched_preset["title"]
            energy = matched_preset["energy"]
            commentary = random.choice(matched_preset["commentary_templates"])
            base_queries = list(matched_preset["default_queries"])
        else:
            vibe_title = f"{req.prompt.title()} Mix"
            energy = "Personalized Flow"
            commentary = f"Got you, {req.user_name}. Spinning a custom selection inspired by '{req.prompt}'. Blending fresh rhythm with your personal taste."
            base_queries = [req.prompt]

        if artist_seed:
            base_queries.insert(0, f"{artist_seed} best songs")
        if lang_seed and lang_seed.lower() != "english":
            base_queries.insert(1, f"{lang_seed} {req.prompt}")

        return {
            "vibe_title": vibe_title,
            "energy_level": energy,
            "dj_commentary": commentary,
            "search_queries": base_queries[:4]
        }

    async def spin_vibe(self, req: AIDJRequest) -> AIDJResponse:
        """
        Executes a complete AI DJ session:
        1. Analyzes prompt & generates DJ commentary
        2. Queries music providers in parallel
        3. Deduplicates and crafts a cohesive setlist
        """
        # Step 1: AI Reasoner (Cloud Gemini or Local Semantic)
        dj_plan = await self._generate_with_gemini(req)
        if not dj_plan:
            dj_plan = self._fallback_vibe_reasoning(req)

        vibe_title = dj_plan.get("vibe_title", "Curated Vibe Session")
        energy_level = dj_plan.get("energy_level", "Dynamic")
        dj_commentary = dj_plan.get("dj_commentary", "Spinning fresh music tailored for you.")
        queries = dj_plan.get("search_queries", [req.prompt])

        # Step 2: Parallel Track Fetching
        gathered_tracks: List[Track] = []
        seen_ids = set()

        async def fetch_for_query(q: str) -> List[Track]:
            try:
                res = await unified_music_service.search(query=q, limit=6)
                return res.tracks or []
            except Exception as e:
                logger.debug(f"AI DJ query search failed for '{q}': {e}")
                return []

        search_tasks = [fetch_for_query(q) for q in queries]
        results = await asyncio.gather(*search_tasks, return_exceptions=True)

        for r in results:
            if isinstance(r, list):
                for t in r:
                    if t.id not in seen_ids and t.id not in req.recent_track_ids:
                        seen_ids.add(t.id)
                        gathered_tracks.append(t)

        # Step 3: Add from catalogue if catalogue matches vibe
        try:
            for cat_track in discovery_service.tracks.values():
                if len(gathered_tracks) >= 12:
                    break
                if cat_track.id not in seen_ids:
                    t_lower = f"{cat_track.title} {cat_track.artist} {cat_track.genre}".lower()
                    if any(w in t_lower for w in req.prompt.lower().split() if len(w) > 3):
                        seen_ids.add(cat_track.id)
                        gathered_tracks.append(cat_track)
        except Exception:
            pass

        # Shuffle gently to feel like a real DJ setlist
        random.shuffle(gathered_tracks)

        return AIDJResponse(
            dj_name=self.name,
            vibe_title=vibe_title,
            energy_level=energy_level,
            dj_commentary=dj_commentary,
            suggested_queries=queries,
            tracks=gathered_tracks[:10]
        )

ai_dj_agent = AIDJAgent()
