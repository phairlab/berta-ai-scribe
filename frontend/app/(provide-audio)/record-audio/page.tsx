import { title, subtitle } from "@/components/primitives";

export default function RecordAudioPage() {
  return (
    <section className="flex flex-col items-center justify-center gap-4 py-8 md:py-10">
      <div className="inline-block max-w-lg text-center justify-center">
        <h1 className={title()}>Record Audio</h1>
        <h2 className={subtitle({ class: "mt-4" })}>Under construction</h2>
      </div>
    </section>
  );
}
