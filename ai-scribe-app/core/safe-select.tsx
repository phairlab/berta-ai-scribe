import { useState } from "react";

import { Select, SelectProps } from "@nextui-org/select";

type SafeSelectProps<T extends object> = Omit<
  SelectProps<T>,
  "isOpen" | "onOpenChange"
>;

/**
 * Select component with a bug fix for the NextUI Select on some
 * mobile browsers, where its scroll-into-view causes the popover
 * to immediately close.  This version prevents closing the popover
 * within 0.5 seconds of opening it.
 */
export const SafeSelect = <T extends object>({
  children,
  ...props
}: SafeSelectProps<T>) => {
  const [isSelectOpen, setIsSelectOpen] = useState(false);
  const [canCloseSelect, setCanCloseSelect] = useState(false);

  return (
    <Select
      isOpen={isSelectOpen}
      onChange={(e) => {
        if (props.onChange) {
          props.onChange(e);
          setIsSelectOpen(false);
          setCanCloseSelect(false);
        }
      }}
      onOpenChange={(open) => {
        if (open) {
          setIsSelectOpen(true);
          setTimeout(() => setCanCloseSelect(true), 500);
        } else if (canCloseSelect) {
          setIsSelectOpen(false);
          setCanCloseSelect(false);
        }
      }}
      onSelectionChange={(keys) => {
        if (props.onSelectionChange) {
          props.onSelectionChange(keys);
          setIsSelectOpen(false);
          setCanCloseSelect(false);
        }
      }}
      {...props}
    >
      {children}
    </Select>
  );
};
