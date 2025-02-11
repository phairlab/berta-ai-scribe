"use client";

import clsx from "clsx";
import { useAtomValue } from "jotai";

import { WaitMessageSpinner } from "@/core/wait-message-spinner";
import { userSessionAtom } from "@/services/identity";
import { formatDisplayName } from "@/utility/formatting";

import { SessionDropdown } from "./session-dropdown";

export const CurrentUser = () => {
  const userSession = useAtomValue(userSessionAtom);

  if (userSession.state === "Authenticating") {
    return (
      <WaitMessageSpinner size="xs">
        <span className="hidden sm:visible">Connecting</span>
      </WaitMessageSpinner>
    );
  }

  if (userSession.state === "Authenticated") {
    return (
      <SessionDropdown>
        <p
          className={clsx(
            "mt-px text-xs text-zinc-400 cursor-pointer text-ellipsis",
            "hover:text-zinc-300 dark:hover:text-zinc-500",
            "max-w-[20vw] md:max-w-[350px]",
            "overflow-clip md:overflow-hidden",
          )}
        >
          {formatDisplayName(userSession.username ?? "Anonymous")}
        </p>
      </SessionDropdown>
    );
  }

  return null;
};
