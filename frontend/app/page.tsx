import { AIScribe } from "@/components/ai-scribe";

export default function Home() {
  return (
    <section className="flex flex-col items-center justify-center gap-4 py-2">
      <div className="w-full max-w-3xl">
        <AIScribe />
      </div>
    </section>
  );
}
