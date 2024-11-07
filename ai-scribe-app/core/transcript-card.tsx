import { Button } from "@nextui-org/button";

import { OutputCard } from "./output-card";
import { Recording } from "./types";

type TranscriptCardProps = {
  recording: Recording;
  showTitle?: boolean;
};

export const TranscriptCard = ({
  recording,
  showTitle = true,
}: TranscriptCardProps) => {
  const isEmptyTranscript = recording.transcript === "";

  const copyNote = async () => {
    if (recording.transcript) {
      await navigator.clipboard.writeText(recording.transcript);
    }
  };

  const controls = (
    <Button color="default" isDisabled={isEmptyTranscript} size="sm" onClick={copyNote}>
      Copy
    </Button>
  );

  return (
    <OutputCard controls={controls} title={showTitle && "Transcript" || isEmptyTranscript && "[Transcript Empty]"}>
      {recording.transcript}
    </OutputCard>
  );
};
