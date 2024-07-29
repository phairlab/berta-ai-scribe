import { Button } from "@nextui-org/button";

import { MicrophoneIcon, PauseIcon } from "./icons";

type RecordButtonProps = {
  isDisabled: boolean;
  isRecording: boolean;
  isRecordingPaused: boolean;
  onClick?: () => void;
};

export const RecordButton = (props: RecordButtonProps) => {
  return (
    <Button
      isIconOnly
      className="h-[64px] w-[64px] my-[3px] flex-none "
      isDisabled={props.isDisabled}
      radius="full"
      size="lg"
      variant="shadow"
      onClick={props.onClick}
    >
      {props.isRecording && !props.isRecordingPaused ? (
        <PauseIcon className="dark:fill-white" size={30} />
      ) : (
        <MicrophoneIcon className="dark:fill-white" size={40} />
      )}
    </Button>
  );
};
