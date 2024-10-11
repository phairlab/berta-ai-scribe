"use client";

import clsx from "clsx";

import { useSession } from "@/services/session-management/use-session";
import { formatDisplayName } from "@/utility/formatters";

import { WaitMessageSpinner } from "./wait-message-spinner";

export const CurrentUser = () => {
  const userSession = useSession();

  return (
    <>
      {userSession.state === "Authenticated" && (
        <p
          className={clsx(
            "mt-px text-xs text-zinc-400 cursor-default text-ellipsis",
            "max-w-[20vw] md:max-w-[350px]",
            "overflow-clip md:overflow-hidden",
          )}
        >
          {formatDisplayName(userSession.details.username)}
        </p>
      )}
      {userSession.state === "Authenticating" && (
        <WaitMessageSpinner size="xs">
          <span className="hidden sm:visible">Logging In</span>
        </WaitMessageSpinner>
      )}
    </>
  );
};
