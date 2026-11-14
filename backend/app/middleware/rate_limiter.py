import time
from collections import defaultdict, deque
import threading
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

class RateLimiterMiddleware(BaseHTTPMiddleware):
    def __init__(
        self,
        app,
        requests_per_minute: int = 180,
        burst_allowance: int = 40,
        exempt_paths: tuple = ("/api/health", "/docs", "/openapi.json", "/redoc", "/")
    ):
        super().__init__(app)
        self.limit = requests_per_minute
        self.burst = burst_allowance
        self.window = 60.0  # 60 seconds
        self.exempt_paths = exempt_paths
        self.clients = defaultdict(deque)
        self.lock = threading.Lock()
        self.last_cleanup = time.time()

    def _cleanup_stale_records(self, now: float):
        """Purges client records older than 5 minutes to prevent memory leaks."""
        if now - self.last_cleanup > 300.0:
            stale_ips = []
            for ip, timestamps in self.clients.items():
                while timestamps and now - timestamps[0] > self.window:
                    timestamps.popleft()
                if not timestamps:
                    stale_ips.append(ip)
            for ip in stale_ips:
                del self.clients[ip]
            self.last_cleanup = now

    async def dispatch(self, request: Request, call_next):
        # Skip OPTIONS pre-flight and exempt routes
        if request.method == "OPTIONS" or request.url.path in self.exempt_paths:
            return await call_next(request)

        # Extract client IP (respecting Reverse Proxies like Cloudflare / Nginx if present)
        client_ip = (
            request.headers.get("cf-connecting-ip")
            or request.headers.get("x-forwarded-for", "").split(",")[0].strip()
            or (request.client.host if request.client else "unknown")
        )

        now = time.time()
        with self.lock:
            self._cleanup_stale_records(now)
            timestamps = self.clients[client_ip]

            # Pop timestamps older than 60s
            cutoff = now - self.window
            while timestamps and timestamps[0] < cutoff:
                timestamps.popleft()

            # Check if exceeded max requests + burst
            max_allowed = self.limit + self.burst
            if len(timestamps) >= max_allowed:
                retry_after = int(max(1.0, 60.0 - (now - timestamps[0])))
                return JSONResponse(
                    status_code=429,
                    content={
                        "error": "Too Many Requests",
                        "message": f"High traffic rate limit exceeded ({self.limit}/min). Please slow down.",
                        "retry_after_seconds": retry_after
                    },
                    headers={
                        "Retry-After": str(retry_after),
                        "X-RateLimit-Limit": str(self.limit),
                        "X-RateLimit-Remaining": "0"
                    }
                )

            timestamps.append(now)
            remaining = max(0, self.limit - len(timestamps))

        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(self.limit)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        return response
