import { useContext } from "react";

import { SessionContext } from "@/contexts/session-context";

export function useSession() {
  const { session } = useContext(SessionContext);

  return session;
}
