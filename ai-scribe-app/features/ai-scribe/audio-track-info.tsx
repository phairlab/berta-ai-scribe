import { formatDuration } from "@/utility/formatters";

type AudioTrackInfoProps = {
  duration: number | null;
  audioId: string;
  audioTitle: string | null;
  isRecording: boolean;
  isRecordingPaused: boolean;
};

export const AudioTrackInfo = ({
  duration,
  audioId,
  audioTitle,
  isRecording,
  isRecordingPaused,
}: AudioTrackInfoProps) => {
  const title = isRecording
    ? isRecordingPaused
      ? "RECORDING PAUSED"
      : "RECORDING"
    : audioTitle;

  return (
    <div className="flex flex-col-reverse sm:flex-row justify-between gap-1 sm:gap-5 md:gap-12 text-xs text-zinc-400 dark:text-zinc-500">
      <div className="font-semibold hidden sm:block">{audioId}</div>
      {title !== null && (
        <div
          className="grow line-clamp-1 text-ellipse text-start sm:text-center"
          title={title}
        >
          {title}
        </div>
      )}
      <div className="flex flex-row w-full sm:w-fit gap-5 justify-between">
        <div className="font-semibold block sm:hidden">{audioId}</div>
        <div className="flex flex-row gap-1">
          <strong>Duration:</strong>
          {duration ? formatDuration(duration) : "--:--"}
        </div>
      </div>
    </div>
  );
};
