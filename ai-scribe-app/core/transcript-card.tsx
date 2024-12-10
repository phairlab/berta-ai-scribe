import { Button } from "@nextui-org/button";

import { OutputCard } from "./output-card";
import { Recording } from "./types";

type TranscriptCardProps = {
  recording: Recording;
  showTitle?: boolean;
};

export const TranscriptCard = ({ recording }: TranscriptCardProps) => {
  const isEmptyTranscript = recording.transcript === "";

  const copyNote = async () => {
    if (recording.transcript) {
      await navigator.clipboard.writeText(recording.transcript);
    }
  };

  const controls = (
    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 w-full">
      <div className="text-lg font-semibold">
        {isEmptyTranscript && "[Transcript Empty]"}
      </div>
      <div className="flex flex-row items-center gap-2">
        <Button
          color="default"
          isDisabled={isEmptyTranscript}
          size="sm"
          onClick={copyNote}
        >
          Copy
        </Button>
      </div>
    </div>
  );

  return <OutputCard controls={controls}>{recording.transcript}</OutputCard>;
};
