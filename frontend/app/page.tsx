import { AudioSelector } from "@/components/audio-selector";
import { title, subtitle } from "@/components/primitives";

export default function Home() {
  return (
    <section className="flex flex-col items-center justify-center gap-4 py-8 md:py-10">
      <AudioSelector />
      <div className="inline-block max-w-lg text-center justify-center py-8 md:py-10">
        <h1 className={title()}>Provide Audio</h1>
        <h2 className={subtitle({ class: "mt-4" })}>
          Provide the recording of a patient conversation using one of the above
          options.
        </h2>
      </div>
    </section>
  );
}
