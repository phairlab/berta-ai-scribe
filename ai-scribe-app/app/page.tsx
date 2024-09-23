"use client";

import { Divider } from "@nextui-org/divider";

import { AIScribe } from "@/components/ai-scribe";
import { EncounterList } from "@/components/encounter-list";
import { UserConsent } from "@/components/user-consent";

export default function Home() {
  return (
    <div className="flex flex-row max-w-5xl gap-5 items-stretch">
      <UserConsent />
      <section className="min-w-[200px] hidden sm:flex flex-col">
        <EncounterList />
      </section>
      <div className="hidden sm:flex">
        <Divider
          className="bg-zinc-100 dark:bg-zinc-900"
          orientation="vertical"
        />
      </div>
      <section className="w-full basis-full flex flex-col items-stretch justify-start py-2">
        <AIScribe />
      </section>
    </div>
  );
}
