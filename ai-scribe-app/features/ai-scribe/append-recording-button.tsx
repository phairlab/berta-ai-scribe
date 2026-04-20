import { Button } from "@heroui/button";

import { MicrophonePlusIcon } from "@/core/icons";

type AppendRecordingButtonProps = {
  isDisabled?: boolean;
  onPress?: () => void;
};

export const AppendRecordingButton = ({
  isDisabled = false,
  onPress,
}: AppendRecordingButtonProps) => (
  <>
    <Button
      className="lg:hidden"
      isDisabled={isDisabled}
      size="sm"
      startContent={
        <MicrophonePlusIcon className="dark:fill-white" size={16} />
      }
      onPress={onPress}
    >
      Append
    </Button>
    <Button
      isIconOnly
      className="hidden lg:flex h-[48px] w-[48px] -ms-[8px] mt-[10px] mb-auto"
      isDisabled={isDisabled}
      radius="full"
      title="Append Audio"
      variant="shadow"
      onPress={onPress}
    >
      <MicrophonePlusIcon className="dark:fill-white mt-px" size={24} />
    </Button>
  </>
);
