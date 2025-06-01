
export class TokenManager {
  private static REFRESH_THRESHOLD_MS = 5 * 60 * 1000; 
  
  static async refreshTokenIfNeeded() {
    if (typeof window === 'undefined') return false;
    
    const accessToken = localStorage.getItem('cognitoAccessToken');
    const refreshToken = localStorage.getItem('cognitoRefreshToken');
    
    if (!accessToken || !refreshToken) {
      return false;
    }
    
    try {
      const payload = this.parseJwt(accessToken);
      const expiryTime = payload.exp * 1000; 
      const currentTime = Date.now();
      
      if (expiryTime - currentTime < this.REFRESH_THRESHOLD_MS) {
        const newTokens = await this.refreshTokens(refreshToken);
        
        localStorage.setItem('cognitoAccessToken', newTokens.access_token);
        if (newTokens.id_token) {
          localStorage.setItem('cognitoIdToken', newTokens.id_token);
        }
        
        return true;
      }
    } catch (error) {
      return false;
    }
    
    return true; 
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
      return { exp: 0 }; 
    }
  }
  
  private static async refreshTokens(refreshToken: string) {
    let cognitoDomain: string | undefined;
    let clientId: string | undefined;
    if (typeof window !== 'undefined' && window.__NEXT_DATA__) {
      try {
        const runtimeConfig = (window as any).__RUNTIME_CONFIG__ || {};
        cognitoDomain = runtimeConfig.NEXT_PUBLIC_COGNITO_DOMAIN;
        clientId = runtimeConfig.NEXT_PUBLIC_COGNITO_CLIENT_ID;
      } catch {
        
      }
    }
    cognitoDomain = cognitoDomain || process.env.NEXT_PUBLIC_COGNITO_DOMAIN;
    clientId = clientId || process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID;
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