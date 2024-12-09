"use client";

import { use } from "react";

import clsx from "clsx";

import { Divider } from "@nextui-org/divider";
import { Progress } from "@nextui-org/progress";

import { ApplicationStateContext } from "@/services/application-state/application-state-context";

import { AIScribe } from "@/features/ai-scribe/ai-scribe";
import { EncounterNavigator } from "@/features/encounter-navigation/encounter-navigator";
import { TermsOfUse } from "@/features/user-session/terms-of-use";

export default function Home() {
  const applicationState = use(ApplicationStateContext);
  const isLoading =
    applicationState.encounters.status !== "Ready" ||
    applicationState.noteTypes.status !== "Ready" ||
    applicationState.sampleRecordings.status !== "Ready";

  return (
    <div className="flex flex-row w-full gap-5 items-start justify-center">
      <TermsOfUse />
      {isLoading ? (
        <div className="flex justify-center items-center w-[50%] h-[40vh]">
          <Progress
            isIndeterminate
            className="max-w-xs"
            label="Loading Scribe"
            size="sm"
          />
        </div>
      ) : (
        <>
          <nav
            className={clsx(
              "hidden sm:block max-h-full",
              "sm:min-w-[200px] sm:max-w-[200px]",
              "md:min-w-[275px] md:max-w-[275px]",
            )}
          >
            <EncounterNavigator />
          </nav>
          <Divider
            className="hidden sm:block bg-zinc-100 dark:bg-zinc-900"
            orientation="vertical"
          />
          <section
            className={clsx(
              "w-full py-2",
              "sm:min-w-[calc(100%-225px)] sm:max-w-[calc(100%-225px)] sm:w-[calc(100%-225px)]",
              "md:min-w-[calc(100%-325px)] md:max-w-[calc(100%-300px)] md:w-[calc(100%-300px)]",
            )}
          >
            <AIScribe />
          </section>
        </>
      )}
    </div>
  );
}
