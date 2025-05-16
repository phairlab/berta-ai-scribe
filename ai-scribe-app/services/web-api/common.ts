export function getBackendUrl(): string {
  if (typeof window === 'undefined') {
    // Server-side, use environment variable
    const serverUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    if (!serverUrl) {
      console.warn('[getBackendUrl] Server-side: NEXT_PUBLIC_BACKEND_URL not set');
      return '';
    }
    return serverUrl;
  }
  
  // Client-side, use runtime config from context
  try {
    // Get runtime config from the window object
    const runtimeConfig = (window as any).__RUNTIME_CONFIG__ || {};
    let url = runtimeConfig.NEXT_PUBLIC_BACKEND_URL || '';
    
    if (!url) {
      console.warn('[getBackendUrl] NEXT_PUBLIC_BACKEND_URL not set in runtime config');
      return '';
    }

    // If the URL already contains the full domain, return it as is
    if (url.startsWith('http://') || url.startsWith('https://')) {
      // Remove trailing slash if present
      url = url.endsWith('/') ? url.slice(0, -1) : url;
      console.log('[getBackendUrl] Using full backend URL:', url);
      return url;
    }

    // If we're in production and the URL doesn't start with http(s), prepend the current origin
    if (process.env.NODE_ENV === 'production') {
      const origin = window.location.origin;
      url = `${origin}/${url}`.replace(/\/+/g, '/');
      console.log('[getBackendUrl] Using origin-based backend URL:', url);
      return url;
    }

    return url;
  } catch (error) {
    console.error('[getBackendUrl] Error accessing runtime config:', error);
    return '';
  }
}

/**
 * Base URL for all API requests
 */
export const API_BASE_URL = process.env.NODE_ENV === 'development' ? 'http://localhost:8000' : '';

/**
 * Fetches data from the API with error handling
 * @param path The API endpoint path
 * @param options The fetch options
 * @returns The fetch response
 */
export async function fetchWithError(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  let fullPath: string;
  
  // If path is already a full URL, use it as is
  if (path.startsWith('http://') || path.startsWith('https://')) {
    fullPath = path;
  } else {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    
    // Use getBackendUrl for production, API_BASE_URL for dev
    if (process.env.NODE_ENV === 'development') {
      fullPath = `${API_BASE_URL}${normalizedPath}`;
    } else {
      const backendUrl = getBackendUrl();
      if (!backendUrl) {
        throw new Error('Backend URL is not configured');
      }
      
      // Ensure we don't have double slashes
      fullPath = `${backendUrl}${normalizedPath}`.replace(/([^:]\/)\/+/g, "$1");
    }
  }
  
  console.log(`Making API request to: ${fullPath}`);
  
  try {
    const response = await fetch(fullPath, {
      ...options,
      credentials: "include", // Include cookies
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
    console.error("API request error:", error);
    throw error;
  }
} 