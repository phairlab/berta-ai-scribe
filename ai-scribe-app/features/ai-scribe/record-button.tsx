import { Button } from "@nextui-org/button";

import { MicrophoneIcon, PauseIcon } from "@/core/icons";

type RecordButtonProps = {
  isDisabled: boolean;
  isRecording: boolean;
  isRecordingPaused: boolean;
  onClick?: () => void;
};

export const RecordButton = ({
  isDisabled,
  isRecording,
  isRecordingPaused,
  onClick,
}: RecordButtonProps) => (
  <Button
    isIconOnly
    className="h-[64px] w-[64px] my-[3px] flex-none "
    isDisabled={isDisabled}
    radius="full"
    size="lg"
    variant="shadow"
    onClick={onClick}
  >
    {isRecording && !isRecordingPaused ? (
      <PauseIcon className="dark:fill-white" size={30} />
    ) : (
      <MicrophoneIcon className="dark:fill-white" size={40} />
    )}
  </Button>
);
