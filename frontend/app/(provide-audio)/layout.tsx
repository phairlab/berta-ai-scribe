import { AudioSelector } from "@/components/audio-selector";

export default function ProvideAudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4 py-8 md:py-10">
      <AudioSelector />
      <div>{children}</div>
    </section>
  );
}
