"use client";

import clsx from "clsx";

import { Listbox, ListboxItem } from "@nextui-org/listbox";
import { Progress } from "@nextui-org/progress";
import { ScrollShadow } from "@nextui-org/scroll-shadow";

import { Encounter } from "@/core/types";
import { WaitMessageSpinner } from "@/core/wait-message-spinner";
import { formatDatetime } from "@/utility/formatting";

import { EncounterDropdown } from "./encounter-dropdown";

type EncounterListProps = {
  encounters: Encounter[];
  activeEncounter: Encounter | null;
  isLoading: boolean;
  canLoadMore: boolean;
  loadMore: () => void;
  onSelected: (encounter: Encounter) => void;
  onLabelChanged: (encounter: Encounter, label: string | null) => void;
  onDelete: (encounter: Encounter) => void;
};

export const EncounterList = ({
  encounters,
  activeEncounter,
  isLoading,
  canLoadMore,
  loadMore,
  onSelected,
  onLabelChanged,
  onDelete,
}: EncounterListProps) => (
  <ScrollShadow className="max-h-[500px]">
    <Listbox
      aria-label="List containing saved recordings"
      itemClasses={{ title: "w-full", wrapper: "relative" }}
    >
      {encounters.map((encounter: Encounter) => (
        <ListboxItem
          key={encounter.id!}
          className={clsx(
            "relative min-h-12 box-border",
            "border-s-4 rounded-s-none border-blue-500 data-[hover=true]:bg-transparent",
            activeEncounter && encounter.id === activeEncounter.id
              ? "border-blue-500"
              : "border-transparent",
          )}
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
              <p className="ms-1 pe-2 line-clamp-2 text-ellipse">
                {encounter.label ??
                  encounter.autolabel ??
                  encounter.id?.toUpperCase()}
              </p>
            )
          }
          textValue={encounter.id}
          onPress={() => onSelected(encounter)}
        >
          <div className="flex flex-row">
            <div className="grow max-w-[135px]">
              {formatDatetime(new Date(encounter.created))}
            </div>
            <EncounterDropdown
              encounter={encounter}
              onDelete={() => onDelete(encounter)}
              onLabelChanged={(label) => onLabelChanged(encounter, label)}
            >
              <div
                className={clsx(
                  "cursor-pointer",
                  "absolute right-0",
                  "w-[30px] h-[25px]",
                  "text-xl text-zinc-500 text-center leading-snug",
                )}
              >
                <div className="-mt-[10px]">...</div>
              </div>
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
