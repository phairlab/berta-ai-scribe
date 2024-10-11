"use client";

import { use } from "react";

import { Divider } from "@nextui-org/divider";
import { Progress } from "@nextui-org/progress";

import { TermsOfUse } from "@/core/terms-of-use";
import { ApplicationStateContext } from "@/services/application-state/application-state-context";

import { AIScribe } from "@/features/ai-scribe/ai-scribe";
import { EncounterNavigator } from "@/features/encounters/encounter-navigator";

export default function Home() {
  const applicationState = use(ApplicationStateContext);
  const isLoading =
    applicationState.encounters.status !== "Ready" ||
    applicationState.noteTypes.status !== "Ready" ||
    applicationState.sampleRecordings.status !== "Ready";

  return (
    <div className="flex flex-row max-w-5xl gap-5 items-stretch">
      <TermsOfUse />
      {!isLoading && (
        <>
          <section className="min-w-[200px] hidden sm:flex flex-col">
            <EncounterNavigator />
          </section>
          <div className="hidden sm:flex">
            <Divider
              className="bg-zinc-100 dark:bg-zinc-900"
              orientation="vertical"
            />
          </div>
        </>
      )}
      {isLoading ? (
        <div className="flex justify-center items-center w-full h-[20vh]">
          <Progress
            isIndeterminate
            className="max-w-sm"
            label="Loading Scribe"
            size="sm"
          />
        </div>
      ) : (
        <section className="w-full basis-full flex flex-col items-stretch justify-start py-2">
          <AIScribe />
        </section>
      )}
    </div>
  );
}
