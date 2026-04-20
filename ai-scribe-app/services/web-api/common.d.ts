export const API_BASE_URL: string;
export function fetchWithError(
  endpoint: string,
  options?: RequestInit
): Promise<Response>; 