import { Button } from "@heroui/button";

import { MicrophoneIcon, PauseIcon } from "@/core/icons";

type RecordButtonProps = {
  isDisabled: boolean;
  isRecording: boolean;
  isRecordingPaused: boolean;
  onPress?: () => void;
};

export const RecordButton = ({
  isDisabled,
  isRecording,
  isRecordingPaused,
  onPress,
}: RecordButtonProps) => (
  <Button
    isIconOnly
    className="h-[64px] w-[64px] my-[3px] flex-none "
    isDisabled={isDisabled}
    radius="full"
    size="lg"
    title={
      isRecording && !isRecordingPaused ? "Pause Recording" : "Record Audio"
    }
    variant="shadow"
    onPress={onPress}
  >
    {isRecording && !isRecordingPaused ? (
      <PauseIcon className="dark:fill-white" size={30} />
    ) : (
      <MicrophoneIcon className="dark:fill-white" size={40} />
    )}
  </Button>
);
