"""
WouldYouMatch? Security, Rate Limiting & Abuse Protection
Provides:
- In-memory sliding-window IP rate limiting
- Security headers middleware
- Production HTTPS protocol redirect middleware
- Input sanitization & email validation
"""
import time
import re
import os
from typing import Dict, List, Tuple
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response, RedirectResponse

EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")
HTML_TAG_REGEX = re.compile(r"<[^>]*?>")

class InMemoryRateLimiter:
    """Sliding-window in-memory rate limiter per IP / identifier."""
    def __init__(self):
        # map key -> list of timestamps
        self._history: Dict[str, List[float]] = {}

    def is_rate_limited(self, identifier: str, action: str, max_requests: int, window_seconds: int) -> bool:
        now = time.time()
        key = f"{action}:{identifier}"
        timestamps = self._history.get(key, [])
        # prune expired timestamps
        cutoff = now - window_seconds
        timestamps = [t for t in timestamps if t > cutoff]
        if len(timestamps) >= max_requests:
            self._history[key] = timestamps
            return True
        timestamps.append(now)
        self._history[key] = timestamps
        return False

rate_limiter = InMemoryRateLimiter()


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Enforces essential production security headers on all HTTP responses."""
    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)
        
        # Prevent MIME-sniffing
        response.headers["X-Content-Type-Options"] = "nosniff"
        
        # Clickjacking defense
        response.headers["X-Frame-Options"] = "DENY"
        
        # Referrer privacy
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        
        # Restrict hardware sensor APIs
        response.headers["Permissions-Policy"] = "geolocation=(), camera=(), microphone=()"

        # HSTS (HTTP Strict Transport Security) - active on HTTPS connections
        is_https = request.url.scheme == "https" or request.headers.get("x-forwarded-proto") == "https"
        if is_https:
            response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains; preload"

        return response


class HTTPSRedirectMiddleware(BaseHTTPMiddleware):
    """
    Redirects HTTP -> HTTPS in production when running behind reverse proxies
    (e.g., Render, Railway, Vercel, Cloudflare) that report via X-Forwarded-Proto.
    """
    async def dispatch(self, request: Request, call_next):
        forwarded_proto = request.headers.get("x-forwarded-proto")
        env_mode = os.getenv("ENVIRONMENT", "development").lower()
        
        # Only enforce redirect if in production or explicit HTTPS enforcement is set
        if forwarded_proto == "http" and env_mode in ("production", "prod"):
            https_url = request.url.replace(scheme="https")
            return RedirectResponse(url=str(https_url), status_code=301)
            
        return await call_next(request)


def sanitize_input(text: str, max_length: int = 500) -> str:
    """Strips HTML tags and clamps string length to prevent injection attacks."""
    if not text:
        return ""
    clean = HTML_TAG_REGEX.sub("", str(text)).strip()
    return clean[:max_length]


def is_valid_email(email: str) -> bool:
    """Validates standard email address format."""
    if not email or len(email) > 254:
        return False
    return bool(EMAIL_REGEX.match(email.strip()))
