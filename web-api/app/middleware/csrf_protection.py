import secrets
import hashlib
from typing import Optional
from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse

class CSRFProtection:
    def __init__(self):
        self.token_length = 32
        self.header_name = "X-CSRF-Token"
        self.cookie_name = "csrf_token"
        
    def generate_token(self) -> str:
        """Generate a new CSRF token"""
        return secrets.token_urlsafe(self.token_length)
    
    def verify_token(self, cookie_token: Optional[str], header_token: Optional[str]) -> bool:
        """Verify CSRF token from cookie matches header"""
        if not cookie_token or not header_token:
            return False
        
        # Constant-time comparison to prevent timing attacks
        return secrets.compare_digest(cookie_token, header_token)
    
    def is_safe_method(self, method: str) -> bool:
        """Check if HTTP method is safe (doesn't modify state)"""
        return method in ["GET", "HEAD", "OPTIONS"]
    
    def should_check_csrf(self, request: Request) -> bool:
        """Determine if request should be checked for CSRF"""
        # Skip CSRF for safe methods
        if self.is_safe_method(request.method):
            return False
            
        # Skip CSRF for API endpoints that use bearer tokens
        auth_header = request.headers.get("authorization", "")
        if auth_header.startswith("Bearer "):
            return False
            
        # Skip for health checks and static files
        if request.url.path in ["/healthcheck", "/favicon.ico"] or request.url.path.startswith("/static"):
            return False
            
        return True


csrf_protection = CSRFProtection()


async def csrf_middleware(request: Request, call_next):
    """CSRF protection middleware"""
    # Only check CSRF for state-changing requests
    if csrf_protection.should_check_csrf(request):
        cookie_token = request.cookies.get(csrf_protection.cookie_name)
        header_token = request.headers.get(csrf_protection.header_name)
        
        if not csrf_protection.verify_token(cookie_token, header_token):
            return JSONResponse(
                status_code=status.HTTP_403_FORBIDDEN,
                content={
                    "detail": {
                        "name": "CSRF Protection",
                        "message": "Invalid or missing CSRF token",
                        "fatal": True
                    }
                }
            )
    
    response = await call_next(request)
    
    # Add CSRF token to response if not present
    if "csrf_token" not in request.cookies:
        token = csrf_protection.generate_token()
        response.set_cookie(
            key=csrf_protection.cookie_name,
            value=token,
            httponly=False,  # JavaScript needs to read this
            secure=True,  # HTTPS only in production
            samesite="strict",
            max_age=86400  # 24 hours
        )
        response.headers[csrf_protection.header_name] = token
    
    return response