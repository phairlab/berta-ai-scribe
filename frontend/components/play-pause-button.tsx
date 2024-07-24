import { Button } from "@nextui-org/button";

import { PauseIcon, PlayIcon } from "./icons";

type PlayPauseButtonProps = {
  isDisabled: boolean;
  action: "play" | "pause";
  onClick?: () => void;
};

export const PlayPauseButton = (props: PlayPauseButtonProps) => {
  return (
    <Button
      isIconOnly
      className="h-[40px] w-[64px] my-[6px] mb-auto"
      isDisabled={props.isDisabled}
      onClick={props.onClick}
    >
      {props.action === "pause" ? (
        <PauseIcon className="dark:fill-white" />
      ) : (
        <PlayIcon className="dark:fill-white" />
      )}
    </Button>
  );
};
