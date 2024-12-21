import { Button } from "@nextui-org/button";

import { MicrophonePlusIcon } from "@/core/icons";

type AppendRecordingButtonProps = {
  isDisabled?: boolean;
  onClick?: () => void;
};

export const AppendRecordingButton = ({
  isDisabled = false,
  onClick,
}: AppendRecordingButtonProps) => (
  <>
    <Button
      className="lg:hidden"
      isDisabled={isDisabled}
      size="sm"
      startContent={
        <MicrophonePlusIcon className="dark:fill-white" size={16} />
      }
      onClick={onClick}
    >
      Append
    </Button>
    <Button
      isIconOnly
      className="hidden lg:flex h-[48px] w-[48px] -ms-[8px] mt-[10px] mb-auto"
      isDisabled={isDisabled}
      radius="full"
      variant="shadow"
      onClick={onClick}
    >
      <MicrophonePlusIcon className="dark:fill-white mt-px" size={24} />
    </Button>
  </>
);
