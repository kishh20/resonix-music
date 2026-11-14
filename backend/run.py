import os
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
    workers_env = int(os.getenv("WORKERS", "1"))
    is_prod = os.getenv("ENV", "development").lower() == "production" or workers_env > 1
    reload_flag = not is_prod

    print("=" * 60)
    print(f"🎵 {settings.APP_NAME} v{settings.VERSION} High-Throughput Backend")
    print("=" * 60)
    print(f"Local URL:        http://127.0.0.1:{settings.PORT}")
    print(f"Network (Phone):  http://{lan_ip}:{settings.PORT}")
    print(f"API Docs:         http://127.0.0.1:{settings.PORT}/docs")
    print(f"Workers:          {workers_env} (Cluster Concurrency)")
    print(f"Auto-Reload:      {reload_flag}")
    print("=" * 60)

    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        workers=workers_env if is_prod else 1,
        reload=reload_flag,
        timeout_keep_alive=30,
        limit_concurrency=1000
    )
