import Link from "next/link";
import { Button } from "@nextui-org/button";

import { title } from "@/components/primitives";

async function getSampleNames(): Promise<string[]> {
  const request = await fetch(`${process.env.APP_API_URL}/audio-samples/list`);
  const sampleNames = await request.json();

  return sampleNames;
}

export default async function SampleAudioPage() {
  const sampleNames: string[] = await getSampleNames();

  return (
    <section className="flex flex-col items-center justify-center gap-4 py-8 md:py-10">
      <div className="inline-block max-w-lg text-center justify-center md:pb-6">
        <h1 className={title()}>Select Audio Sample</h1>
      </div>
      <div className="grid grid-flow-row grid-cols-2 md:grid-cols-3 gap-5 py-4">
        {sampleNames.map((sampleName: string) => (
          <Link
            key={sampleName}
            href={`/patient-conversations/sample:${sampleName}`}
          >
            <Button
              key={sampleName}
              className="text-center"
              size="lg"
              variant="ghost"
            >
              {sampleName}
            </Button>
          </Link>
        ))}
      </div>
    </section>
  );
}
