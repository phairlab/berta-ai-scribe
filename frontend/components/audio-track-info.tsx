import { useEffect, useState } from "react";

import { formatDuration } from "@/utility/audio-helpers";

type AudioTrackInfoProps = {
  duration: number | null;
  audioTitle?: string | null;
  isRecording: boolean;
  isRecordingPaused: boolean;
};

export const AudioTrackInfo = (props: AudioTrackInfoProps) => {
  const [title, setTitle] = useState<string | undefined>();

  useEffect(() => {
    const newTitle = props.isRecording
      ? props.isRecordingPaused
        ? "RECORDING PAUSED"
        : "RECORDING"
      : props.audioTitle ?? undefined;

    setTitle(newTitle);
  });

  return (
    <div className="flex flex-col-reverse sm:flex-row justify-between items-end sm:gap-2 text-xs text-zinc-400 dark:text-zinc-500">
      <div className="truncate max-w-[250px] font-semibold" title={title}>
        {title}
      </div>
      <div className="flex flex-row gap-1">
        <strong>Duration:</strong>
        {props.duration ? formatDuration(props.duration) : "N/A"}
      </div>
    </div>
  );
};
