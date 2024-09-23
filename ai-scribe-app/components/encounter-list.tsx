"use client";

import { useContext } from "react";
import { Listbox, ListboxItem } from "@nextui-org/listbox";
import { ScrollShadow } from "@nextui-org/scroll-shadow";
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
} from "@nextui-org/dropdown";
import { Progress } from "@nextui-org/progress";

import { EncountersContext } from "@/contexts/encounters-context";
import { ActiveEncounterContext } from "@/contexts/active-encounter-context";
import { Encounter } from "@/models";
import { formatDatestring } from "@/utility/display";
import { webApiAction } from "@/utility/web-api";
import { useAccessToken } from "@/hooks/use-access-token";

import { DeleteDocumentIcon } from "./icons";

export const EncounterList = () => {
  const accessToken = useAccessToken();
  const { encounters, setEncounters } = useContext(EncountersContext);
  const { activeEncounter, setActiveEncounter } = useContext(
    ActiveEncounterContext,
  );

  const selectEncounter = (encounter: Encounter) => {
    const id = encounter?.newId ?? encounter.uuid;
    const activeId = activeEncounter?.newId ?? activeEncounter?.uuid;

    if (activeId !== id) {
      setActiveEncounter(encounter);
    }
  };

  const deleteEncounter = (encounter: Encounter) => {
    const id = encounter.newId ?? encounter.uuid;
    const activeId = activeEncounter?.newId ?? activeEncounter?.uuid;

    setEncounters([...encounters.filter((e) => (e.newId ?? e.uuid) !== id)]);

    if (id === activeId) {
      setActiveEncounter(null);
    }

    deleteEncounterFromDb(encounter);
  };

  const handleMenuAction = (key: string, encounter: Encounter) => {
    if (key === "delete") {
      deleteEncounter(encounter);
    }
  };

  const deleteEncounterFromDb = async (
    encounter: Encounter,
    retry: number = 0,
  ) => {
    if (encounter.uuid) {
      try {
        void (await webApiAction<Encounter>(
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
        disabledKeys={!activeEncounter ? ["new"] : []}
        itemClasses={{ title: "font-semibold" }}
      >
        <ListboxItem
          key="new"
          className={`h-12 ${!activeEncounter ? "border-s-4 rounded-s-none border-blue-500" : ""}`}
          textValue="New Recording"
          onPress={() => setActiveEncounter(null)}
        >
          <span className="text-blue-500 dark:text-blue-400 text-bold">
            New Recording
          </span>
        </ListboxItem>
      </Listbox>
      {encounters.length === 0 ? (
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
        <>
          <ScrollShadow className="max-h-[500px]">
            <Listbox
              aria-label="List containing saved recordings"
              itemClasses={{ title: "w-full" }}
            >
              {encounters.map((encounter: Encounter) => (
                <ListboxItem
                  key={encounter.newId ?? encounter.uuid ?? ""}
                  className={`h-12 relative ${activeEncounter && (activeEncounter.newId ?? activeEncounter.uuid) == (encounter.newId ?? encounter.uuid) ? "border-s-4 rounded-s-none border-blue-500 data-[hover=true]:bg-transparent data-[hover=true]:cursor-default" : ""}`}
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
                  onPress={() => selectEncounter(encounter)}
                >
                  <div className="flex flex-row gap-2">
                    <p className="grow">
                      {formatDatestring(encounter.createdAt)}
                    </p>
                    <Dropdown className="absolute right-0.5 top-0 z-10">
                      <DropdownTrigger className="cursor-pointer">
                        <p className="text-xl text-zinc-500 leading-none align-top -mt-2 me-2">
                          ...
                        </p>
                      </DropdownTrigger>
                      <DropdownMenu
                        onAction={(key) =>
                          handleMenuAction(key.toString(), encounter)
                        }
                      >
                        <DropdownItem
                          key="delete"
                          className="text-red-600 dark:text-rose-500"
                          description="Cannot be undone"
                          startContent={
                            <DeleteDocumentIcon className="mt-px text-xl pointer-events-none flex-shrink-0" />
                          }
                        >
                          <span className="">Delete Record</span>
                        </DropdownItem>
                      </DropdownMenu>
                    </Dropdown>
                  </div>
                </ListboxItem>
              ))}
            </Listbox>
          </ScrollShadow>
        </>
      )}
    </>
  );
};
