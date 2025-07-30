export function getBackendUrl(): string {
  if (typeof window === 'undefined') {
    
    const serverUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    if (!serverUrl) {
      console.warn('[getBackendUrl] Server-side: NEXT_PUBLIC_BACKEND_URL not set');
      return '';
    }
    return serverUrl;
  }
  
  
  try {
    
    const runtimeConfig = (window as any).__RUNTIME_CONFIG__ || {};
    let url = runtimeConfig.NEXT_PUBLIC_BACKEND_URL || '';
    

    
    if (url.startsWith('http://') || url.startsWith('https://')) {
      
      url = url.endsWith('/') ? url.slice(0, -1) : url;
      return url;
    }

    if (process.env.NODE_ENV === 'production') {
      const origin = window.location.origin;
      url = `${origin}/${url}`.replace(/\/+/g, '/');
      return url;
    }

    return url;
  } catch (error) {
    return '';
  }
}


export const API_BASE_URL = process.env.NODE_ENV === 'development' ? 'http://localhost:8000' : '';

export async function fetchWithError(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  let fullPath: string;
  
  if (path.startsWith('http://') || path.startsWith('https://')) {
    fullPath = path;
  } else {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    
    if (process.env.NODE_ENV === 'development') {
      fullPath = `${API_BASE_URL}${normalizedPath}`;
    } else {
      const backendUrl = getBackendUrl();
      if (!backendUrl) {
        throw new Error('Backend URL is not configured');
      }
      
      fullPath = `${backendUrl}${normalizedPath}`.replace(/([^:]\/)\/+/g, "$1");
    }
  }
  
  
  try {
    const response = await fetch(fullPath, {
      ...options,
      credentials: "include", 
      headers: {
        ...options.headers,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API request failed: ${response.status} ${response.statusText}`, errorText);
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    return response;
  } catch (error) {
    throw error;
  }
} 