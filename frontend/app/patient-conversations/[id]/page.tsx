import { Divider } from "@nextui-org/divider";

import { AudioPlayer } from "@/components/audio-player";
import { AIScribe } from "@/components/ai-scribe";

export default function PatientConversationPage({
  params,
}: {
  params: { id: string };
}) {
  const id = decodeURIComponent(params.id);

  const sampleRegex = /^(sample\:)/;
  const isSample = sampleRegex.test(id);

  let audioUrl;

  if (!isSample) {
    audioUrl = `/data/audio-file?id=${id}`;
  } else {
    const sampleId = id.replace(sampleRegex, "");

    audioUrl = `/data/audio-file?id=${sampleId}&type=sample`;
  }

  return (
    <div className="flex items-center flex-col gap-8">
      <div className="w-full max-w-3xl">
        <AudioPlayer audioUrl={`..${audioUrl}`} />
      </div>
      <Divider />
      <AIScribe audioUrl={audioUrl} />
    </div>
  );
}
