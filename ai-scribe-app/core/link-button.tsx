import { MouseEventHandler, PropsWithChildren } from "react";

import clsx from "clsx";

type LinkButtonProps = PropsWithChildren<{
  className: string;
  isDisabled?: boolean;
  onPress?: MouseEventHandler<HTMLButtonElement>;
}>;

export const LinkButton = ({
  className,
  isDisabled,
  onPress,
  children,
}: LinkButtonProps) => (
  <button
    className={clsx([
      "relative inline-flex items-center p-0 bg-transparent no-underline border-none outline-none",
      isDisabled
        ? "cursor-default pointer-events-none opacity-disabled"
        : "cursor-pointer tap-highlight-transparent hover:opacity-80 active:opacity-disabled transition-opacity",
      className,
    ])}
    disabled={isDisabled}
    type="button"
    onClick={onPress}
  >
    {children}
  </button>
);
