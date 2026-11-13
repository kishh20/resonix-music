import random
import string
import time
import logging
from typing import Dict, List, Optional, Any, Set
from fastapi import WebSocket

logger = logging.getLogger(__name__)

def generate_jam_code() -> str:
    chars = string.ascii_uppercase + string.digits.replace('0', '').replace('O', '').replace('I', '').replace('1', '')
    return "JAM-" + "".join(random.choices(chars, k=4))

class JamSession:
    def __init__(self, jam_code: str, host_id: str, host_name: str, host_avatar: Optional[str] = None):
        self.jam_code = jam_code
        self.host_id = host_id
        self.host_name = host_name
        self.host_controls_only = False
        self.created_at = time.time()
        self.current_track: Optional[Dict[str, Any]] = None
        self.is_playing: bool = False
        self.position: float = 0.0
        self.participants: Dict[str, Dict[str, Any]] = {
            host_id: {
                "user_id": host_id,
                "user_name": host_name,
                "avatar_url": host_avatar,
                "is_host": True,
                "joined_at": time.time()
            }
        }
        self.queue: List[Dict[str, Any]] = []
        self.connections: Set[WebSocket] = set()

    def to_dict(self) -> Dict[str, Any]:
        return {
            "jam_code": self.jam_code,
            "host_id": self.host_id,
            "host_name": self.host_name,
            "host_controls_only": self.host_controls_only,
            "current_track": self.current_track,
            "is_playing": self.is_playing,
            "position": self.position,
            "participants": list(self.participants.values()),
            "queue": self.queue,
            "created_at": self.created_at
        }

    async def broadcast(self, message: Dict[str, Any]):
        dead = []
        for ws in self.connections:
            try:
                await ws.send_json(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.connections.discard(ws)


class JamManager:
    def __init__(self):
        self.active_jams: Dict[str, JamSession] = {}

    def create_jam(self, host_id: str, host_name: str, host_avatar: Optional[str] = None) -> JamSession:
        jam_code = generate_jam_code()
        while jam_code in self.active_jams:
            jam_code = generate_jam_code()

        session = JamSession(jam_code, host_id, host_name, host_avatar)
        self.active_jams[jam_code] = session
        logger.info(f"Jam session created: {jam_code} by {host_name}")
        return session

    def get_jam(self, jam_code: str) -> Optional[JamSession]:
        return self.active_jams.get(jam_code.upper().strip())

    def remove_jam(self, jam_code: str):
        if jam_code in self.active_jams:
            del self.active_jams[jam_code]

jam_manager = JamManager()
