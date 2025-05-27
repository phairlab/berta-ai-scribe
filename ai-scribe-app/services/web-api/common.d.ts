/**
 * Base URL for all API requests
 */
export const API_BASE_URL: string;

/**
 * Fetches data from the API with error handling
 * @param endpoint The API endpoint (without the /api prefix)
 * @param options Fetch options
 * @returns The fetch response
 * @throws Error if the fetch fails or returns a non-2xx status code
 */
export function fetchWithError(
  endpoint: string,
  options?: RequestInit
): Promise<Response>; 