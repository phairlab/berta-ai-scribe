"use client";

import { PropsWithChildren } from "react";

import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
} from "@nextui-org/dropdown";

import { DeleteDocumentIcon } from "@/core-ui/icons";
import { formatDatestring } from "@/utility/formatters";

import { Encounter } from "./encounter";

type EncounterDropdownMenu = PropsWithChildren<{
  encounter: Encounter;
  onDelete: (encounter: Encounter) => void;
}>;

export const EncounterDropdown = ({
  children,
  encounter,
  onDelete,
}: EncounterDropdownMenu) => {
  const handleAction = (key: string, encounter: Encounter) => {
    if (key === "delete") {
      onDelete(encounter);
    }
  };

  return (
    <div className="flex flex-row gap-2">
      <p className="grow">{formatDatestring(encounter.createdAt)}</p>
      <Dropdown className="absolute right-0.5 top-0 z-10">
        <DropdownTrigger className="cursor-pointer">{children}</DropdownTrigger>
        <DropdownMenu
          onAction={(key) => handleAction(key.toString(), encounter)}
        >
          <DropdownItem
            key="delete"
            className="text-red-600 dark:text-rose-500"
            description="Cannot be undone"
            startContent={
              <DeleteDocumentIcon className="mt-px text-xl pointer-events-none flex-shrink-0" />
            }
          >
            Delete Record
          </DropdownItem>
        </DropdownMenu>
      </Dropdown>
    </div>
  );
};
