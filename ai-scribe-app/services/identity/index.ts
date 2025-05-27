import { atom } from "jotai";
import { jwtDecode } from "jwt-decode";

type Authentication =
  | { state: "Authenticated"; token: string }
  | { state: "Unauthenticated" | "Authenticating" | "Failed" };

type SessionData = {
  username: string;
  sessionId: string;
  rights: string[];
};

type UserSession =
  | ({ state: "Authenticated" } & SessionData)
  | { state: Exclude<Authentication["state"], "Authenticated"> };

const authenticationAtom = atom<Authentication>({ state: "Unauthenticated" });

const authenticationStateAtom = atom((get) => get(authenticationAtom).state);

const webApiTokenAtom = atom((get) => {
  const authentication = get(authenticationAtom);
  console.log("Getting web API token, authentication state:", authentication.state);

  if (authentication.state === "Authenticated") {
    console.log("Returning web API token");
    return authentication.token;
  }

  console.log("No web API token available");
  return undefined;
});

const userSessionAtom = atom<UserSession>((get) => {
  const authentication = get(authenticationAtom);
  const state = authentication.state;

  if (state === "Authenticated") {
    const token = get(webApiTokenAtom);

    if (!token) {
      console.error("Unable to load user session - no token available");
      throw new Error("Unable to load user session");
    }

    try {
      const { username, sessionId, rights } = jwtDecode<SessionData>(token);
      console.log("User session loaded:", { username, sessionId });
      return { state, username, sessionId, rights };
    } catch (error) {
      console.error("Error decoding token:", error);
      throw new Error("Invalid token format");
    }
  }

  return { state };
});

export {
  authenticationAtom,
  authenticationStateAtom,
  webApiTokenAtom,
  userSessionAtom,
};
