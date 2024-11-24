"use client";

import { use } from "react";

import { Divider } from "@nextui-org/divider";
import { Progress } from "@nextui-org/progress";

import { TermsOfUse } from "@/core/terms-of-use";
import { ApplicationStateContext } from "@/services/application-state/application-state-context";

import { AIScribe } from "@/features/ai-scribe/ai-scribe";
import { EncounterNavigator } from "@/features/encounter-navigation/encounter-navigator";

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
          <nav className="hidden sm:block w-[200px]">
            <EncounterNavigator />
          </nav>
          <Divider
            className="hidden sm:block bg-zinc-100 dark:bg-zinc-900"
            orientation="vertical"
          />
          <section className="w-full sm:w-[calc(100%-220px)] py-2">
            <AIScribe />
          </section>
        </>
      )}
    </div>
  );
}
