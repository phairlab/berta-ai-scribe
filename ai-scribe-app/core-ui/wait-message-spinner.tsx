import { PropsWithChildren } from "react";

import clsx from "clsx";

import { Link } from "@nextui-org/link";
import { Spinner } from "@nextui-org/spinner";

type WaitMessageSpinnerProps = PropsWithChildren<{
  size?: "xs" | "sm" | "md" | "lg";
  onCancel?: () => void;
}>;

export const WaitMessageSpinner = ({
  children,
  size = "md",
  onCancel,
}: WaitMessageSpinnerProps) => (
  <div className="flex flex-row gap-3 items-center justify-center">
    <div
      className={clsx(
        "flex flex-row justify-center items-center",
        ["xs", "sm"].includes(size) ? "gap-3" : "gap-4",
      )}
    >
      <Spinner
        classNames={{
          wrapper: clsx({ "h-[14px] w-[14px]": size === "xs" }),
        }}
        color="default"
        size={size == "xs" ? "sm" : size}
      />
      <span className={clsx(`text-${size}`, "text-zinc-500")}>{children}</span>
    </div>
    {onCancel && (
      <Link
        className={clsx(`text-${size}`, "text-blue-500")}
        href="#"
        onClick={onCancel}
      >
        (Cancel)
      </Link>
    )}
  </div>
);
