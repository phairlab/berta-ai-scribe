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
    
    // For non-Cognito production auth (e.g., Snowflake)
    const response = await fetchWithError("/auth/authenticate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token: "snowflake_token" }),
      credentials: 'include', // Important: This ensures cookies are sent with the request
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
 * @returns A Web API token for the current session
 */
export async function authenticateWithCognito(token: string): Promise<WebApiToken> {
  console.log("Sending token to backend for authentication");
  
  try {
    // Cognito authentication
    const response = await fetchWithError("/auth/authenticate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token }),
      credentials: 'include', // Important: This ensures cookies are sent with the request
    });
    
    console.log("Backend response status:", response.status);

    // Try to extract the token from the response.
    const data = await response.json();
    
    console.log("Backend response received:", data ? "Valid JSON data" : "No data");

    if (typeof data.accessToken !== "string") {
      console.error("Invalid token format from backend:", data);
      throw Error("The response from the server did not include a valid token");
    }
    
    console.log("Successfully obtained API token from backend");
    return data.accessToken;
  } catch (error) {
    console.error("Cognito authentication with backend failed:", error);
    throw error;
  }
}
