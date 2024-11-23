"use client";

import clsx from "clsx";

import { Listbox, ListboxItem } from "@nextui-org/listbox";
import { Progress } from "@nextui-org/progress";
import { ScrollShadow } from "@nextui-org/scroll-shadow";

import { Encounter } from "@/core/types";
import { WaitMessageSpinner } from "@/core/wait-message-spinner";
import { formatDatetime } from "@/utility/formatters";

import { EncounterDropdown } from "./encounter-dropdown";

type EncounterListProps = {
  encounters: Encounter[];
  activeEncounter: Encounter | null;
  isLoading: boolean;
  canLoadMore: boolean;
  loadMore: () => void;
  onSelected: (encounter: Encounter) => void;
  onDelete: (encounter: Encounter) => void;
};

export const EncounterList = ({
  encounters,
  activeEncounter,
  isLoading,
  canLoadMore,
  loadMore,
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
          key={encounter.id!}
          className={clsx("h-12 relative", {
            "border-s-4 rounded-s-none border-blue-500 data-[hover=true]:bg-transparent":
              activeEncounter && encounter.id === activeEncounter.id,
          })}
          description={
            !encounter.tracking.isPersisted && encounter.tracking.hasError ? (
              <p className="ms-1 text-red-500 font-semibold">
                ERROR - NOT SAVED
              </p>
            ) : encounter.tracking.isSaving &&
              !encounter.tracking.isPersisted ? (
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
              <p className="ms-1">{encounter.label?.toUpperCase()}</p>
            )
          }
          textValue={encounter.id}
          onPress={() => onSelected(encounter)}
        >
          <div className="flex flex-row gap-2">
            <p className="grow">
              {formatDatetime(new Date(encounter.created))}
            </p>
            <EncounterDropdown
              encounter={encounter}
              onDelete={() => onDelete(encounter)}
            >
              <p className="cursor-pointer text-xl text-zinc-500 leading-none align-top -mt-2 me-2">
                ...
              </p>
            </EncounterDropdown>
          </div>
        </ListboxItem>
      ))}
    </Listbox>
    <Listbox
      aria-label="List containing a placeholder for saved recordings"
      disabledKeys={canLoadMore && !isLoading ? [] : ["load-more"]}
    >
      <ListboxItem
        key="load-more"
        className="data-[hover=true]:bg-transparent"
        textValue=" "
        onPress={loadMore}
      >
        {isLoading ? (
          <WaitMessageSpinner size="sm">Loading</WaitMessageSpinner>
        ) : !canLoadMore ? (
          <div className="text-sm text-zinc-500 text-center">
            All Recordings <br />
            Loaded
          </div>
        ) : (
          <div className="text-blue-500 text-center">Load More</div>
        )}
      </ListboxItem>
    </Listbox>
  </ScrollShadow>
);
