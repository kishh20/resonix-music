import asyncio
import logging
import time
from typing import Dict, Any, Optional

from app.agents.ai_dj_agent import ai_dj_agent
from app.agents.discovery_radar_agent import discovery_radar_agent
from app.agents.lyrics_weaver_agent import lyrics_weaver_agent
from app.agents.stream_healer_agent import stream_healer_agent

logger = logging.getLogger(__name__)

# Execution intervals in seconds
INTERVAL_RADAR = 2 * 60 * 60    # Every 2 hours
INTERVAL_WEAVER = 1 * 60 * 60   # Every 1 hour
INTERVAL_HEALER = 3 * 60 * 60   # Every 3 hours

class AgentManager:
    """
    Central Agent Orchestration Hub.
    Manages autonomous agent lifecycles, background execution schedules,
    and telemetry monitoring across the 4 specialized agents.
    """
    def __init__(self):
        self._running = False
        self._task: Optional[asyncio.Task] = None
        self._last_radar_run = 0.0
        self._last_weaver_run = 0.0
        self._last_healer_run = 0.0

    async def start(self):
        """Starts the autonomous background agent loop."""
        if self._running:
            return
        self._running = True
        self._task = asyncio.create_task(self._orchestration_loop())
        logger.info("🎵 Resonix Multi-Agent Fleet initialized & active.")

    async def stop(self):
        """Gracefully halts background agent operations."""
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        logger.info("🛑 Resonix Multi-Agent Fleet safely stopped.")

    async def _orchestration_loop(self):
        # Allow server to boot before initial agent sweeps
        await asyncio.sleep(10)

        while self._running:
            try:
                now = time.time()

                # 1. Chart Radar Agent Trigger (Every 2 hours)
                if now - self._last_radar_run >= INTERVAL_RADAR:
                    logger.info("[Agent Fleet] Activating Chart Radar Agent sweep...")
                    asyncio.create_task(discovery_radar_agent.scan_and_harvest())
                    self._last_radar_run = now

                # 2. Lyrics Weaver Agent Trigger (Every 1 hour)
                if now - self._last_weaver_run >= INTERVAL_WEAVER:
                    logger.info("[Agent Fleet] Activating Lyrics Weaver Agent pass...")
                    asyncio.create_task(lyrics_weaver_agent.scan_and_heal_catalogue(batch_size=15))
                    self._last_weaver_run = now

                # 3. Stream Quality Healer Trigger (Every 3 hours)
                if now - self._last_healer_run >= INTERVAL_HEALER:
                    logger.info("[Agent Fleet] Activating Stream Quality Healer cycle...")
                    asyncio.create_task(stream_healer_agent.run_healing_cycle(max_tracks=20))
                    self._last_healer_run = now

            except Exception as e:
                logger.error(f"[Agent Fleet] Orchestration loop exception: {e}")

            # Sleep 60 seconds before next schedule check
            await asyncio.sleep(60)

    def get_telemetry(self) -> Dict[str, Any]:
        """Aggregates real-time telemetry from all active agents."""
        return {
            "fleet_status": "online" if self._running else "idle",
            "active_agent_count": 4,
            "agents": {
                "ai_dj": {
                    "name": ai_dj_agent.name,
                    "type": "Interactive In-App Sonic Companion",
                    "status": "online",
                    "model_source": "Gemini API" if ai_dj_agent.gemini_api_key else "Local Semantic Vibe Engine"
                },
                "discovery_radar": discovery_radar_agent.get_telemetry(),
                "lyrics_weaver": lyrics_weaver_agent.get_telemetry(),
                "stream_healer": stream_healer_agent.get_telemetry()
            }
        }

    async def trigger_agent(self, agent_name: str, payload: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Manually trigger an on-demand task for a specific agent."""
        agent_name = agent_name.lower().strip()
        payload = payload or {}

        if agent_name in ("radar", "discovery", "chart_radar"):
            target_artists = payload.get("target_artists")
            return await discovery_radar_agent.scan_and_harvest(target_artists=target_artists)
        elif agent_name in ("weaver", "lyrics", "lyrics_weaver"):
            batch_size = payload.get("batch_size", 20)
            return await lyrics_weaver_agent.scan_and_heal_catalogue(batch_size=batch_size)
        elif agent_name in ("healer", "stream", "stream_healer"):
            max_tracks = payload.get("max_tracks", 25)
            return await stream_healer_agent.run_healing_cycle(max_tracks=max_tracks)
        else:
            return {"error": f"Unknown agent '{agent_name}'. Available: radar, weaver, healer"}

agent_manager = AgentManager()
