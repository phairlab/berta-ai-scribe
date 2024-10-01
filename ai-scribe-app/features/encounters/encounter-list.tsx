"use client";

import clsx from "clsx";

import { Listbox, ListboxItem } from "@nextui-org/listbox";
import { Progress } from "@nextui-org/progress";
import { ScrollShadow } from "@nextui-org/scroll-shadow";

import { Encounter } from "./encounter";
import { EncounterDropdown } from "./encounter-dropdown";

type EncounterListProps = {
  encounters: Encounter[];
  activeId: string | undefined;
  onSelected: (encounter: Encounter) => void;
  onDelete: (encounter: Encounter) => void;
};

export const EncounterList = ({
  encounters,
  activeId,
  onSelected,
  onDelete,
}: EncounterListProps) => (
  <ScrollShadow className="max-h-[500px]">
    <Listbox
      aria-label="List containing saved recordings"
      itemClasses={{ title: "w-full" }}
    >
      {encounters.map((encounter: Encounter) => (
        <ListboxItem
          key={(encounter.newId ?? encounter.uuid)!}
          className={clsx("h-12 relative", {
            "border-s-4 rounded-s-none border-blue-500 data-[hover=true]:bg-transparent":
              activeId && (encounter.newId ?? encounter.uuid) === activeId,
          })}
          description={
            encounter.isUnsaved ? (
              <div className="flex flex-row gap-2 items-center justify-start ms-1 w-24">
                <p className="text-xs">Saving</p>
                <Progress
                  isIndeterminate
                  aria-label="Saving"
                  className="mt-1"
                  color="default"
                  size="sm"
                />
              </div>
            ) : (
              <p className="ms-1">{encounter.title?.toUpperCase()}</p>
            )
          }
          textValue={encounter.title}
          onPress={() => onSelected(encounter)}
        >
          <EncounterDropdown
            encounter={encounter}
            onDelete={() => onDelete(encounter)}
          >
            <p className="text-xl text-zinc-500 leading-none align-top -mt-2 me-2">
              ...
            </p>
          </EncounterDropdown>
        </ListboxItem>
      ))}
    </Listbox>
  </ScrollShadow>
);
