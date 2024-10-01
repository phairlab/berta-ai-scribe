"use client";

import clsx from "clsx";

import { Listbox, ListboxItem } from "@nextui-org/listbox";

import { WaitMessageSpinner } from "@/core-ui/wait-message-spinner";
import { useAccessToken } from "@/services/session-management/use-access-token";
import { httpAction } from "@/services/web-api/base-queries";

import { Encounter } from "./encounter";
import { EncounterList } from "./encounter-list";
import { useActiveEncounter } from "./use-active-encounter";
import { useEncounters } from "./use-encounters";

type EncounterNavigatorProps = {
  onEncounterSelected?: (encounter: Encounter | null) => void;
};

export const EncounterNavigator = ({
  onEncounterSelected,
}: EncounterNavigatorProps) => {
  const { accessToken } = useAccessToken();
  const encounters = useEncounters();
  const activeEncounter = useActiveEncounter();

  const selectEncounter = (encounter: Encounter | null) => {
    if (!encounter) {
      if (activeEncounter !== null) {
        activeEncounter.set(null);
      }
    } else {
      const id = encounter?.newId ?? encounter.uuid;
      const activeId =
        activeEncounter.state?.newId ?? activeEncounter.state?.uuid;

      if (activeId !== id) {
        activeEncounter.set(encounter);
      }
    }

    onEncounterSelected?.(encounter);
  };

  const deleteEncounter = (encounter: Encounter) => {
    const id = encounter.newId ?? encounter.uuid;
    const activeId =
      activeEncounter.state?.newId ?? activeEncounter.state?.uuid;

    encounters.set([
      ...encounters.state.filter((e) => (e.newId ?? e.uuid) !== id),
    ]);

    if (id === activeId) {
      activeEncounter.set(null);
    }

    deleteEncounterFromDb(encounter);
  };

  const deleteEncounterFromDb = async (
    encounter: Encounter,
    retry: number = 0,
  ) => {
    if (encounter.uuid) {
      try {
        void (await httpAction<Encounter>(
          "DELETE",
          `/api/encounters/${encounter.uuid}`,
          {
            accessToken: accessToken,
          },
        ));
      } catch {
        setTimeout(
          () => deleteEncounterFromDb(encounter, retry + 1),
          (retry + 1) * 3000,
        );
      }
    } else {
      // Wait for encounter to be saved.
      setTimeout(() => deleteEncounterFromDb(encounter), 1000);
    }
  };

  return (
    <>
      <Listbox
        aria-label="List containing the new recording option"
        // disabledKeys={!activeEncounter ? ["new"] : []}
        itemClasses={{ title: "font-semibold" }}
      >
        <ListboxItem
          key="new"
          className={clsx("h-12", {
            "border-s-4 rounded-s-none border-blue-500 data-[hover=true]:bg-transparent":
              !activeEncounter,
          })}
          textValue="New Recording"
          onPress={() => selectEncounter(null)}
        >
          <span className="text-blue-500 dark:text-blue-400 text-bold">
            New Recording
          </span>
        </ListboxItem>
      </Listbox>
      {!encounters.isFetched ? (
        <div className="flex justify-start items-start ms-4 w-auto">
          <WaitMessageSpinner size="xs">Loading Encounters</WaitMessageSpinner>
        </div>
      ) : encounters.state.length === 0 ? (
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
          activeId={activeEncounter.state?.newId ?? activeEncounter.state?.uuid}
          encounters={encounters.state}
          onDelete={deleteEncounter}
          onSelected={selectEncounter}
        />
      )}
    </>
  );
};
