import { Divider } from "@nextui-org/divider";

import { AudioPlayer } from "@/components/audio-player";

export default function PatientConversationPage({
  params,
}: {
  params: { conversationId: string };
}) {
  const conversationId = decodeURIComponent(params.conversationId);
  const audioUrl = `../data/audio?id=${conversationId}`;

  return (
    <div className="flex items-center flex-col gap-8">
      <div className="w-full max-w-3xl">
        <AudioPlayer audioUrl={audioUrl} />
      </div>
      <Divider />
    </div>
  );
}
