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
  // Ensure path starts with a forward slash
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const fullPath = `${API_BASE_URL}${normalizedPath}`;
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
      console.error(`API request failed: ${response.status} ${response.statusText}`);
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    return response;
  } catch (error) {
    console.error("API request error:", error);
    throw error;
  }
} 