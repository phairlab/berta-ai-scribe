from fastapi import Request
from typing import Dict

def get_security_headers(is_production: bool = True) -> Dict[str, str]:
    """Get security headers based on environment"""
    headers = {
        # Prevent XSS attacks
        "X-Content-Type-Options": "nosniff",
        
        # Prevent clickjacking
        "X-Frame-Options": "DENY",
        
        # Enable browser XSS protection
        "X-XSS-Protection": "1; mode=block",
        
        # Control referrer information
        "Referrer-Policy": "strict-origin-when-cross-origin",
        
        # Permissions Policy (replaces Feature-Policy)
        "Permissions-Policy": "geolocation=(), microphone=(self), camera=()"
    }
    
    if is_production:
        # Strict Transport Security (HSTS) - only in production with HTTPS
        headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"
        
        # Content Security Policy - adjust based on your needs
        headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdnjs.cloudflare.com; "
            "style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; "
            "img-src 'self' data: https:; "
            "font-src 'self' data:; "
            "connect-src 'self' https://*.amazonaws.com wss://*.amazonaws.com; "
            "frame-ancestors 'none'; "
            "base-uri 'self'; "
            "form-action 'self'"
        )
    
    return headers


async def security_headers_middleware(request: Request, call_next):
    """Add security headers to all responses"""
    response = await call_next(request)
    
    # Determine if we're in production
    from app.config import settings
    is_production = settings.ENVIRONMENT == "production"
    
    # Add security headers
    security_headers = get_security_headers(is_production)
    for header, value in security_headers.items():
        response.headers[header] = value
    
    return response