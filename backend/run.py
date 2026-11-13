import uvicorn
import socket
from app.config import settings

def get_lan_ip() -> str:
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

if __name__ == "__main__":
    lan_ip = get_lan_ip()
    print("=" * 60)
    print(f"🎵 {settings.APP_NAME} v{settings.VERSION} Backend")
    print("=" * 60)
    print(f"Local URL:        http://127.0.0.1:{settings.PORT}")
    print(f"Network (Phone):  http://{lan_ip}:{settings.PORT}")
    print(f"API Docs:         http://127.0.0.1:{settings.PORT}/docs")
    print("=" * 60)
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=True)
