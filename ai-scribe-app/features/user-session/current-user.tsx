"use client";

import clsx from "clsx";

import { WaitMessageSpinner } from "@/core/wait-message-spinner";
import { useSession } from "@/services/session-management/use-session";
import { formatDisplayName } from "@/utility/formatters";

import { SessionDropdown } from "./session-dropdown";

export const CurrentUser = () => {
  const userSession = useSession();

  return (
    <>
      {userSession.state === "Authenticated" && (
        <SessionDropdown>
          <p
            className={clsx(
              "mt-px text-xs text-zinc-400 cursor-pointer text-ellipsis",
              "hover:text-zinc-300 dark:hover:text-zinc-500",
              "max-w-[20vw] md:max-w-[350px]",
              "overflow-clip md:overflow-hidden",
            )}
          >
            {formatDisplayName(userSession.details.username)}
          </p>
        </SessionDropdown>
      )}
      {userSession.state === "Authenticating" && (
        <WaitMessageSpinner size="xs">
          <span className="hidden sm:visible">Connecting</span>
        </WaitMessageSpinner>
      )}
    </>
  );
};
