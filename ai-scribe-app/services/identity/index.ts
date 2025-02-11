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

  if (authentication.state === "Authenticated") {
    return authentication.token;
  }

  return undefined;
});

const userSessionAtom = atom<UserSession>((get) => {
  const authentication = get(authenticationAtom);
  const state = authentication.state;

  if (state === "Authenticated") {
    const token = get(webApiTokenAtom);

    if (!token) {
      throw new Error("Unable to load user session");
    }

    const { username, sessionId, rights } = jwtDecode<SessionData>(token);

    return { state, username, sessionId, rights };
  }

  return { state };
});

export {
  authenticationAtom,
  authenticationStateAtom,
  webApiTokenAtom,
  userSessionAtom,
};
