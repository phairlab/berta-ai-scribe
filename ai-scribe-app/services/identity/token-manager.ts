// Token manager to handle refresh and expiry
export class TokenManager {
  private static REFRESH_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes before expiry
  
  static async refreshTokenIfNeeded() {
    if (typeof window === 'undefined') return false;
    
    const accessToken = localStorage.getItem('cognitoAccessToken');
    const refreshToken = localStorage.getItem('cognitoRefreshToken');
    
    if (!accessToken || !refreshToken) {
      return false;
    }
    
    try {
      // Check if token is expired or about to expire
      const payload = this.parseJwt(accessToken);
      const expiryTime = payload.exp * 1000; // Convert to milliseconds
      const currentTime = Date.now();
      
      if (expiryTime - currentTime < this.REFRESH_THRESHOLD_MS) {
        // Token is about to expire, refresh it
        const newTokens = await this.refreshTokens(refreshToken);
        
        localStorage.setItem('cognitoAccessToken', newTokens.access_token);
        if (newTokens.id_token) {
          localStorage.setItem('cognitoIdToken', newTokens.id_token);
        }
        
        return true;
      }
    } catch (error) {
      console.error('Error checking/refreshing token:', error);
      return false;
    }
    
    return true; // Token is valid and not about to expire
  }
  
  private static parseJwt(token: string) {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error('Error parsing JWT token:', error);
      return { exp: 0 }; // Return a token that will trigger refresh
    }
  }
  
  private static async refreshTokens(refreshToken: string) {
    const cognitoDomain = process.env.NEXT_PUBLIC_COGNITO_DOMAIN;
    const clientId = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID;
    
    if (!cognitoDomain || !clientId) {
      throw new Error('Missing required environment variables for token refresh');
    }
    
    const response = await fetch(`${cognitoDomain}/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: clientId,
        refresh_token: refreshToken,
      }).toString(),
    });
    
    if (!response.ok) {
      throw new Error('Failed to refresh token');
    }
    
    return await response.json();
  }
} 