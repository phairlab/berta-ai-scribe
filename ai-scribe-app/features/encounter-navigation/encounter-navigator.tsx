"use client";

import clsx from "clsx";

import { Listbox, ListboxItem } from "@nextui-org/listbox";

import { Encounter } from "@/core/types";
import { WaitMessageSpinner } from "@/core/wait-message-spinner";
import { useEncounters } from "@/services/application-state/use-encounters";

import { EncounterList } from "./encounter-list";

type EncounterNavigatorProps = {
  onEncounterSelected?: (encounter: Encounter | null) => void;
};

export const EncounterNavigator = ({
  onEncounterSelected,
}: EncounterNavigatorProps) => {
  const encounters = useEncounters();
  const activeEncounter = encounters.activeEncounter;

  const selectEncounter = (encounter: Encounter | null) => {
    encounters.setActive(encounter);
    onEncounterSelected?.(encounter);
  };

  return (
    <>
      <Listbox
        aria-label="List containing the new recording option"
        itemClasses={{ title: "font-semibold" }}
      >
        <ListboxItem
          key="new"
          className={clsx(
            "h-12",
            "border-s-4 rounded-s-none  data-[hover=true]:bg-transparent",
            !activeEncounter ? "border-blue-500" : "border-transparent",
          )}
          textValue="New Recording"
          onPress={() => selectEncounter(null)}
        >
          <span className="text-blue-500 dark:text-blue-400 text-bold">
            New Recording
          </span>
        </ListboxItem>
      </Listbox>
      {!encounters.isReady ? (
        <div className="flex justify-start items-start ms-4 mt-4 w-auto">
          <WaitMessageSpinner size="xs">
            Loading Saved Recordings
          </WaitMessageSpinner>
        </div>
      ) : encounters.list.length === 0 ? (
        <Listbox
          aria-label="List containing a placeholder for saved recordings"
          disabledKeys={["placeholder"]}
        >
          <ListboxItem
            key="placeholder"
            className="h-24"
            description="There are currently no saved recordings"
            textValue=" "
          />
        </Listbox>
      ) : (
        <EncounterList
          activeEncounter={activeEncounter}
          canLoadMore={encounters.canLoadMore}
          encounters={encounters.list}
          isLoading={encounters.isLoading}
          loadMore={encounters.loadMore}
          onDelete={(encounter) => encounters.purge(encounter)}
          onLabelChanged={(encounter, label) =>
            encounters.save({ ...encounter, label: label })
          }
          onSelected={selectEncounter}
        />
      )}
    </>
  );
};
