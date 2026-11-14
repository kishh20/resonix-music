import logging
from typing import Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Body
from app.agents import (
    ai_dj_agent,
    AIDJRequest,
    AIDJResponse,
    agent_manager
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/agents", tags=["AI Agents"])

@router.post("/dj/spin", response_model=AIDJResponse)
async def spin_dj_vibe(req: AIDJRequest):
    """
    Invokes the AI DJ Agent to analyze user's prompt, generate live DJ commentary,
    and curate a high-fidelity track queue tailored to their preferences.
    """
    if not req.prompt or not req.prompt.strip():
        raise HTTPException(status_code=400, detail="DJ prompt cannot be empty.")
    try:
        return await ai_dj_agent.spin_vibe(req)
    except Exception as e:
        logger.error(f"AI DJ spin error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"AI DJ encountered an error: {str(e)}")

@router.get("/telemetry")
async def get_agent_telemetry():
    """
    Retrieves real-time status, health, and operational metrics
    across all 4 Resonix autonomous agents.
    """
    return agent_manager.get_telemetry()

@router.post("/trigger/{agent_name}")
async def trigger_agent_task(
    agent_name: str,
    payload: Optional[Dict[str, Any]] = Body(default={})
):
    """
    Manually triggers an on-demand task for a specific agent:
    - 'radar' -> Chart Radar Agent (scrapes trending & new artist releases)
    - 'weaver' -> Lyrics Weaver Agent (heals un-synced/missing lyrics)
    - 'healer' -> Stream Quality Healer (validates & recovers audio streams)
    """
    result = await agent_manager.trigger_agent(agent_name, payload)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result
