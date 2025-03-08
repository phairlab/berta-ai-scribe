"use client";

import { KeyboardEventHandler, PropsWithChildren, useState } from "react";

import clsx from "clsx";

import { Button } from "@heroui/button";
import { Divider } from "@heroui/divider";
import { Textarea } from "@heroui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@heroui/popover";

import { DeleteDocumentIcon } from "@/core/icons";
import { Encounter } from "@/core/types";

type EncounterDropdownProps = PropsWithChildren<{
  encounter: Encounter;
  onLabelChanged: (label: string | null) => void;
  onDelete: () => void;
}>;

export const EncounterDropdown = ({
  children,
  encounter,
  onLabelChanged,
  onDelete,
}: EncounterDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isConfirmDelete, setIsConfirmDelete] = useState(false);
  const [label, setLabel] = useState(() => encounter.label);

  const confirmDelete = () => setIsConfirmDelete(true);
  const cancelDelete = () => setIsConfirmDelete(false);

  const handleDeleteConfirmed = () => {
    onDelete();
  };

  const handleMenuClosed = () => {
    cancelDelete();

    if (encounter.label !== label) {
      onLabelChanged(label?.trim() === "" ? null : label);
    }
  };

  const handleKeyDown: KeyboardEventHandler<HTMLDivElement> = (ev) => {
    if (ev.key === "Enter") {
      setIsOpen(false);
      handleMenuClosed();
    }
  };

  return (
    <Popover
      showArrow
      className={clsx("inline-flex flex-col items-center subpixel-antialiased")}
      classNames={{ content: "p-1" }}
      isOpen={isOpen}
      placement="bottom-end"
      onClick={cancelDelete}
      onClose={handleMenuClosed}
      onKeyDown={handleKeyDown}
      onOpenChange={(open) => setIsOpen(open)}
    >
      <PopoverTrigger>{children}</PopoverTrigger>
      <PopoverContent aria-label="Encounter actions">
        <div className="w-fit flex flex-col justify-center gap-1 p-1">
          <div className="w-full flex justify-start h-fit m-0 px-2 py-1.5">
            <Textarea
              label="Modify Label"
              labelPlacement="outside"
              maxRows={7}
              minRows={1}
              placeholder={encounter.autolabel ?? undefined}
              value={label ?? ""}
              onValueChange={(text) =>
                setLabel(text.replaceAll("\n", "").slice(0, 100))
              }
            />
          </div>
          <Divider className="mt-2 mb-1" />
          {isConfirmDelete ? (
            <Button
              className={clsx(
                "text-red-600 dark:text-rose-500",
                "w-full flex group justify-start h-fit m-0 px-2 py-1.5",
              )}
              radius="sm"
              startContent={
                <DeleteDocumentIcon className="mt-px text-xl pointer-events-none flex-shrink-0" />
              }
              variant="faded"
              onPress={handleDeleteConfirmed}
            >
              <div className="flex flex-col text-start">
                <div className="text-sm">CONFIRM DELETE</div>
                <div className="text-tiny text-zinc-500">
                  Click anywhere else to cancel
                </div>
              </div>
            </Button>
          ) : (
            <Button
              className={clsx(
                "text-red-600 dark:text-rose-500",
                "w-full flex group justify-start h-fit m-0 px-2 py-1.5",
              )}
              isDisabled={!encounter.isPersisted}
              radius="sm"
              startContent={
                <DeleteDocumentIcon className="mt-px text-xl pointer-events-none flex-shrink-0" />
              }
              variant="light"
              onPress={confirmDelete}
            >
              <div className="flex flex-col text-start">
                <div className="text-sm">Delete Recording</div>
                <div className="text-tiny text-zinc-500">Cannot be undone</div>
              </div>
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
