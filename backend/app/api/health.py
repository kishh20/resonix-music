import socket
from fastapi import APIRouter
from app.config import settings

router = APIRouter(prefix="/api", tags=["System"])

def get_lan_ip() -> str:
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

@router.get("/health")
async def health():
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.VERSION
    }

@router.get("/network-info")
async def network_info():
    lan_ip = get_lan_ip()
    frontend_url = f"http://{lan_ip}:5173"
    backend_url = f"http://{lan_ip}:8000"
    return {
        "lan_ip": lan_ip,
        "frontend_url": frontend_url,
        "backend_url": backend_url,
        "is_local": lan_ip.startswith("192.168.") or lan_ip.startswith("10.") or lan_ip.startswith("172.")
    }
