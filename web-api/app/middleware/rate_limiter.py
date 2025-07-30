from datetime import datetime, timedelta
from collections import defaultdict
from typing import Dict, Tuple
import asyncio
from fastapi import HTTPException, Request, status
from fastapi.responses import JSONResponse

class RateLimiter:
    def __init__(self, requests_per_minute: int = 60, requests_per_hour: int = 600):
        self.requests_per_minute = requests_per_minute
        self.requests_per_hour = requests_per_hour
        self.requests: Dict[str, list[datetime]] = defaultdict(list)
        self.cleanup_interval = 300  # Clean up old entries every 5 minutes
        self.last_cleanup = datetime.now()
        
    def _get_client_id(self, request: Request) -> str:
        """Get client identifier from request (IP or user session)"""
        # Try to get authenticated user from session
        auth_header = request.headers.get("authorization", "")
        if auth_header.startswith("Bearer "):
            return f"user:{auth_header[7:30]}"  # Use part of token as ID
            
        # Fall back to IP address
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            # AWS ALB adds the original client IP as the first in the list
            client_ip = forwarded_for.split(",")[0].strip()
        else:
            client_ip = request.client.host if request.client else "unknown"
            
        return f"ip:{client_ip}"
    
    def _cleanup_old_requests(self):
        """Remove requests older than 1 hour"""
        now = datetime.now()
        if (now - self.last_cleanup).seconds < self.cleanup_interval:
            return
            
        cutoff = now - timedelta(hours=1)
        for client_id in list(self.requests.keys()):
            self.requests[client_id] = [
                req_time for req_time in self.requests[client_id] 
                if req_time > cutoff
            ]
            if not self.requests[client_id]:
                del self.requests[client_id]
                
        self.last_cleanup = now
    
    def is_allowed(self, request: Request) -> Tuple[bool, str]:
        """Check if request is allowed under rate limits"""
        self._cleanup_old_requests()
        
        client_id = self._get_client_id(request)
        now = datetime.now()
        
        request_times = self.requests[client_id]
        
        one_minute_ago = now - timedelta(minutes=1)
        recent_requests = [t for t in request_times if t > one_minute_ago]
        if len(recent_requests) >= self.requests_per_minute:
            return False, f"Rate limit exceeded: {self.requests_per_minute} requests per minute"
        
        one_hour_ago = now - timedelta(hours=1)
        hourly_requests = [t for t in request_times if t > one_hour_ago]
        if len(hourly_requests) >= self.requests_per_hour:
            return False, f"Rate limit exceeded: {self.requests_per_hour} requests per hour"
        
        self.requests[client_id].append(now)
        
        return True, ""


# Global rate limiter instance
rate_limiter = RateLimiter()

# Different limits for different endpoints
api_limiters = {
    "/api/tasks/transcribe": RateLimiter(requests_per_minute=10, requests_per_hour=100),
    "/api/tasks/generate": RateLimiter(requests_per_minute=10, requests_per_hour=100),
    "/api/recordings": RateLimiter(requests_per_minute=30, requests_per_hour=300),
}


async def rate_limit_middleware(request: Request, call_next):
    """Rate limiting middleware for FastAPI"""
    # Skip rate limiting for health checks and static files
    if request.url.path in ["/healthcheck", "/favicon.ico"] or request.url.path.startswith("/static"):
        return await call_next(request)
    
    # Use endpoint-specific limiter if available
    limiter = api_limiters.get(request.url.path, rate_limiter)
    
    allowed, message = limiter.is_allowed(request)
    if not allowed:
        return JSONResponse(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            content={
                "detail": {
                    "name": "Rate Limit Exceeded",
                    "message": message,
                    "fatal": False
                }
            },
            headers={
                "Retry-After": "60",  # Tell client to retry after 60 seconds
                "X-RateLimit-Limit": str(limiter.requests_per_minute),
                "X-RateLimit-Remaining": "0",
                "X-RateLimit-Reset": str(int((datetime.now() + timedelta(minutes=1)).timestamp()))
            }
        )
    
    response = await call_next(request)
    
    client_id = limiter._get_client_id(request)
    now = datetime.now()
    one_minute_ago = now - timedelta(minutes=1)
    recent_requests = [t for t in limiter.requests[client_id] if t > one_minute_ago]
    
    response.headers["X-RateLimit-Limit"] = str(limiter.requests_per_minute)
    response.headers["X-RateLimit-Remaining"] = str(max(0, limiter.requests_per_minute - len(recent_requests)))
    response.headers["X-RateLimit-Reset"] = str(int((now + timedelta(minutes=1)).timestamp()))
    
    return response