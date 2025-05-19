import { fetchWithError } from "@/services/web-api/common";



/**
 * A token from the Web API indicating a valid session.
 */
export type WebApiToken = string;

/**
 * Authenticates the user based on the environment.
 * In development, uses a simple no-auth mode.
 * In production, uses either Cognito or Snowflake auth.
 * @returns A Web API token for the current session.
 */
export async function authenticate(): Promise<WebApiToken> {
  try {
    console.log("Attempting authentication...");
    
    // Use only the relative path for fetchWithError
    const response = await fetchWithError('/auth/authenticate', {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token: "snowflake_token" }),
      credentials: 'include',
    });
    
    console.log("Authentication response received:", response.status);
    const data = await response.json();
    
    if (typeof data.accessToken === "string") {
      console.log("Authentication successful");
      return data.accessToken;
    }
    
    console.error("Invalid authentication response:", data);
    throw Error("Authentication failed - invalid response format");
  } catch (error) {
    console.error("Authentication error:", error);
    throw error;
  }
}

/**
 * Authenticates using Cognito access token or authorization code
 * @param token The Cognito access token or authorization code
 * @param backendUrl Optional backend URL
 * @returns A Web API token for the current session
 */
export async function authenticateWithCognito(token: string, backendUrl?: string): Promise<WebApiToken> {
  console.log("Sending token to backend for authentication");

  // If backendUrl is provided and is a full URL, use fetch directly
  if (backendUrl && (backendUrl.startsWith('http://') || backendUrl.startsWith('https://'))) {
    const url = `${backendUrl}/auth/authenticate`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token }),
      credentials: 'include',
    });
    const data = await response.json();
    if (typeof data.accessToken !== "string") {
      throw Error("The response from the server did not include a valid token");
    }
    return data.accessToken;
  }
  // Otherwise, use fetchWithError with a relative path
  const response = await fetchWithError('/auth/authenticate', {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ token }),
    credentials: 'include',
  });
  const data = await response.json();
  if (typeof data.accessToken !== "string") {
    throw Error("The response from the server did not include a valid token");
  }
  return data.accessToken;
}
/**
 * Authenticates using Google token or authorization code
 * @param token The Google ID token or authorization code
 * @param backendUrl Optional backend URL
 * @param isAuthCode Whether the token is an authorization code (default: false)
 * @returns A Web API token for the current session
 */
export async function authenticateWithGoogle(token: string, backendUrl?: string, isAuthCode: boolean = false): Promise<WebApiToken> {
  console.log("Sending Google token to backend for authentication");

  // If backendUrl is provided and is a full URL, use fetch directly
  if (backendUrl && (backendUrl.startsWith('http://') || backendUrl.startsWith('https://'))) {
    const url = `${backendUrl}/auth/authenticate-google`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token, isAuthCode }),
      credentials: 'include',
    });
    const data = await response.json();
    if (typeof data.accessToken !== "string") {
      throw Error("The response from the server did not include a valid token");
    }
    return data.accessToken;
  }
  
  // Otherwise, use fetchWithError with a relative path
  const response = await fetchWithError('/auth/authenticate-google', {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ token, isAuthCode }),
    credentials: 'include',
  });
  
  const data = await response.json();
  if (typeof data.accessToken !== "string") {
    throw Error("The response from the server did not include a valid token");
  }
  return data.accessToken;
}