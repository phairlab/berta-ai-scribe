import { Button } from "@heroui/button";

import { PauseIcon, PlayIcon } from "@/core/icons";

type PlayPauseButtonProps = {
  isDisabled: boolean;
  action: "play" | "pause";
  onPress?: () => void;
};

export const PlayPauseButton = ({
  isDisabled,
  action,
  onPress,
}: PlayPauseButtonProps) => (
  <Button
    isIconOnly
    className="h-[40px] w-[64px] mt-[12px] mb-auto"
    isDisabled={isDisabled}
    title={action === "pause" ? "Pause Playback" : "Play Audio"}
    onPress={onPress}
  >
    {action === "pause" ? (
      <PauseIcon className="dark:fill-white" />
    ) : (
      <PlayIcon className="dark:fill-white" />
    )}
  </Button>
);
