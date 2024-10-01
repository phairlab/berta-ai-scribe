import { headerNames } from "@/config/keys";

export type WebApiToken = string;

type AuthenticationResponse = {
  accessToken: WebApiToken;
  tokenType: string;
};

export async function authenticate(
  userAgent: string | null = null,
): Promise<WebApiToken> {
  let headers: HeadersInit = {};

  if (userAgent) {
    headers = { ...headers, [headerNames.JenkinsUserAgent]: userAgent };
  }

  const response = await fetch("api/authenticate", {
    headers: headers,
    cache: "no-store",
  });

  if (!response.ok) {
    throw Error("Authentication failed");
  }

  const { accessToken } = (await response.json()) as AuthenticationResponse;

  return accessToken;
}
