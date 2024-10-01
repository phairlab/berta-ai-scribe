import { formatDuration } from "@/utility/formatters";

type AudioTrackInfoProps = {
  duration: number | null;
  audioTitle?: string | null;
  isRecording: boolean;
  isRecordingPaused: boolean;
};

export const AudioTrackInfo = ({
  duration,
  audioTitle,
  isRecording,
  isRecordingPaused,
}: AudioTrackInfoProps) => {
  const title = isRecording
    ? isRecordingPaused
      ? "RECORDING PAUSED"
      : "RECORDING"
    : (audioTitle ?? "Audio");

  return (
    <div className="flex flex-col-reverse sm:flex-row justify-between items-end sm:gap-2 text-xs text-zinc-400 dark:text-zinc-500">
      <div className="truncate max-w-[250px] font-semibold" title={title}>
        {title}
      </div>
      <div className="flex flex-row gap-1">
        <strong>Duration:</strong>
        {duration ? formatDuration(duration) : "--:--"}
      </div>
    </div>
  );
};
