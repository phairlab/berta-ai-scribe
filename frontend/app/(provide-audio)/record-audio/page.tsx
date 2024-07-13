import { AudioRecorder } from "@/components/audio-recorder";

export default function RecordAudioPage() {
  return (
    <section className="flex flex-col items-center justify-center gap-4 py-8 md:py-10">
      <div className="w-full max-w-3xl">
        <AudioRecorder />
      </div>
    </section>
  );
}
