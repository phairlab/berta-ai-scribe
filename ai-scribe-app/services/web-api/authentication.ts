import { fetchWithError } from "@/services/web-api/common";
export type WebApiToken = string;

export async function authenticate(): Promise<WebApiToken> {
  try {
    
    const response = await fetchWithError('/auth/authenticate', {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token: "snowflake_token" }),
      credentials: 'include',
    });
    
    const data = await response.json();
    
    if (typeof data.accessToken === "string") {
      return data.accessToken;
    }
    
    throw Error("Authentication failed - invalid response format");
  } catch (error) {
    throw error;
  }
}


export async function authenticateWithCognito(token: string, backendUrl?: string): Promise<WebApiToken> {

  
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

export async function authenticateWithGoogle(token: string, backendUrl?: string, isAuthCode: boolean = false): Promise<WebApiToken> {

  
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