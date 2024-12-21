import { Button } from "@nextui-org/button";

import { PauseIcon, PlayIcon } from "@/core/icons";

type PlayPauseButtonProps = {
  isDisabled: boolean;
  action: "play" | "pause";
  onClick?: () => void;
};

export const PlayPauseButton = ({
  isDisabled,
  action,
  onClick,
}: PlayPauseButtonProps) => (
  <Button
    isIconOnly
    className="h-[40px] w-[64px] mt-[12px] mb-auto"
    isDisabled={isDisabled}
    onClick={onClick}
  >
    {action === "pause" ? (
      <PauseIcon className="dark:fill-white" />
    ) : (
      <PlayIcon className="dark:fill-white" />
    )}
  </Button>
);
