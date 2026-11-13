from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from app.services.jam_service import jam_manager, JamSession

router = APIRouter(prefix="/api/jam", tags=["jam"])

class CreateJamRequest(BaseModel):
    user_id: str
    user_name: str
    avatar_url: Optional[str] = None
    current_track: Optional[Dict[str, Any]] = None

class ControlSettingsRequest(BaseModel):
    host_controls_only: bool

@router.post("/create")
def create_jam(payload: CreateJamRequest):
    """
    Creates a new Spotify-style collaborative Jam room.
    """
    session = jam_manager.create_jam(
        host_id=payload.user_id,
        host_name=payload.user_name,
        host_avatar=payload.avatar_url
    )
    if payload.current_track:
        session.current_track = payload.current_track
    return session.to_dict()

@router.get("/{jam_code}")
def get_jam_info(jam_code: str):
    """
    Retrieves info about an active Jam room.
    """
    session = jam_manager.get_jam(jam_code)
    if not session:
        raise HTTPException(status_code=404, detail="Jam session not found or expired")
    return session.to_dict()

@router.websocket("/ws/{jam_code}")
async def jam_websocket(
    websocket: WebSocket,
    jam_code: str,
    user_id: str = Query(...),
    user_name: str = Query(...),
    avatar_url: Optional[str] = Query(None)
):
    """
    Real-time collaborative WebSocket for Jam playback and shared queue sync.
    """
    session = jam_manager.get_jam(jam_code)
    if not session:
        await websocket.close(code=4004, reason="Jam not found")
        return

    await websocket.accept()
    session.connections.add(websocket)

    # Register user in session
    is_host = (user_id == session.host_id)
    session.participants[user_id] = {
        "user_id": user_id,
        "user_name": user_name,
        "avatar_url": avatar_url,
        "is_host": is_host
    }

    # Broadcast initial join & state
    await session.broadcast({
        "type": "USER_JOINED",
        "user": session.participants[user_id],
        "state": session.to_dict()
    })

    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")

            # Check permissions
            can_control = is_host or not session.host_controls_only

            if msg_type == "PLAY_TRACK" and can_control:
                session.current_track = data.get("track")
                session.is_playing = True
                session.position = 0.0
                await session.broadcast({
                    "type": "TRACK_CHANGED",
                    "track": session.current_track,
                    "sender_id": user_id
                })

            elif msg_type == "SET_PLAYING" and can_control:
                session.is_playing = bool(data.get("is_playing"))
                await session.broadcast({
                    "type": "PLAY_STATE_CHANGED",
                    "is_playing": session.is_playing,
                    "sender_id": user_id
                })

            elif msg_type == "SEEK" and can_control:
                session.position = float(data.get("time", 0))
                await session.broadcast({
                    "type": "SEEK_SYNC",
                    "time": session.position,
                    "sender_id": user_id
                })

            elif msg_type == "QUEUE_ADD":
                track = data.get("track")
                if track:
                    session.queue.append(track)
                    await session.broadcast({
                        "type": "QUEUE_UPDATED",
                        "queue": session.queue,
                        "added_by": user_name
                    })

            elif msg_type == "QUEUE_REMOVE":
                track_id = data.get("track_id")
                if track_id:
                    session.queue = [t for t in session.queue if t.get("id") != track_id]
                    await session.broadcast({
                        "type": "QUEUE_UPDATED",
                        "queue": session.queue
                    })

            elif msg_type == "TOGGLE_HOST_ONLY" and is_host:
                session.host_controls_only = bool(data.get("host_controls_only"))
                await session.broadcast({
                    "type": "SETTINGS_CHANGED",
                    "host_controls_only": session.host_controls_only
                })

    except WebSocketDisconnect:
        session.connections.discard(websocket)
        if user_id in session.participants:
            del session.participants[user_id]
        
        # If host left and empty, clean up after 5 minutes
        if len(session.connections) == 0:
            pass

        await session.broadcast({
            "type": "USER_LEFT",
            "user_id": user_id,
            "participants": list(session.participants.values())
        })
    except Exception as e:
        session.connections.discard(websocket)
