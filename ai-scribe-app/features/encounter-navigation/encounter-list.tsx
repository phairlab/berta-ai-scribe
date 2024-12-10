"use client";

import clsx from "clsx";

import { Divider } from "@nextui-org/divider";
import { Listbox, ListboxItem, ListboxSection } from "@nextui-org/listbox";
import { Progress } from "@nextui-org/progress";
import { ScrollShadow } from "@nextui-org/scroll-shadow";

import { Encounter } from "@/core/types";
import { WaitMessageSpinner } from "@/core/wait-message-spinner";
import { formatDateWithWeekday, formatTime } from "@/utility/formatting";
import { byDate } from "@/utility/sorting";

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
}: EncounterListProps) => {
  const encounterGroups = encounters
    .sort(byDate((e) => new Date(e.created), "Descending"))
    .reduce(
      (groups, e) => {
        const date = formatDateWithWeekday(new Date(e.created));

        let group = groups.find((g) => g.date === date);

        if (!group) {
          group = { date: date, encounters: [] };
          groups.push(group);
        }

        group.encounters.push(e);

        return groups;
      },
      [] as { date: string; encounters: Encounter[] }[],
    );

  return (
    <ScrollShadow className="min-h-full min-h-[400px] max-h-[calc(100vh-200px)]">
      <Divider className="mt-3 mb-1 ms-2 px-2 w-[calc(100%-20px)] opacity-50" />
      <Listbox
        aria-label="List containing saved recordings"
        itemClasses={{ title: "w-full", wrapper: "relative" }}
      >
        {encounterGroups.map((g) => (
          <ListboxSection
            key={g.date}
            showDivider
            classNames={{
              heading: "text-xs font-semibold text-blue-600 dark:text-blue-400",
              divider: "ms-1 w-[calc(100%-15px)] opacity-50",
            }}
            title={g.date}
          >
            {g.encounters.map((encounter) => (
              <ListboxItem
                key={encounter.id!}
                className={clsx(
                  "relative min-h-12 box-border",
                  "data-[hover=true]:bg-zinc-50 data-[hover=true]:dark:bg-zinc-900 data-[focus=true]:bg-transparent",
                  activeEncounter && encounter.id === activeEncounter.id
                    ? "border-s-4 rounded-s-none border-blue-500 w-[calc(100%-10px)]"
                    : "border-transparent ms-[4px] w-[calc(100%-14px)]",
                )}
                classNames={{
                  title:
                    "text-xs mb-1 font-semibold text-zinc-600 dark:text-zinc-400",
                  description: "text-zinc-500",
                }}
                description={
                  !encounter.tracking.isPersisted &&
                  encounter.tracking.hasError ? (
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
                    <p className="pe-2 line-clamp-2 text-ellipse">
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
                    {formatTime(new Date(encounter.created))}
                  </div>
                  <EncounterDropdown
                    encounter={encounter}
                    onDelete={() => onDelete(encounter)}
                    onLabelChanged={(label) => onLabelChanged(encounter, label)}
                  >
                    <div
                      className={clsx(
                        "cursor-pointer",
                        "absolute right-0 top-0",
                        "w-[30px] h-[25px]",
                        "text-xl text-zinc-500 text-center leading-snug pb-1 -mt-0.5",
                      )}
                    >
                      <div className="">···</div>
                    </div>
                  </EncounterDropdown>
                </div>
              </ListboxItem>
            ))}
          </ListboxSection>
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
            <div className="text-sm text-zinc-500 text-center pb-5">
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
};
