import clsx from "clsx";

import { SelectItem, SelectSection } from "@heroui/select";

import { MobileCompatibleSelect } from "@/core/mobile-compatible-select";
import { Encounter, Recording, SampleRecording } from "@/core/types";
import { useEncounters } from "@/services/state/encounters-context";
import { useSampleRecordings } from "@/services/state/sample-recordings-context";
import { formatShortDatetime } from "@/utility/formatting";
import { byDate } from "@/utility/sorting";

type AnyRecordingType = Recording | SampleRecording;

type MixedRecordingSelectorProps = {
  selectedRecording: AnyRecordingType | undefined;
  onRecordingSelected: (recording: AnyRecordingType | undefined) => void;
};

export const MixedRecordingSelector = ({
  selectedRecording,
  onRecordingSelected,
}: MixedRecordingSelectorProps) => {
  const encounters = useEncounters();
  const sampleRecordings = useSampleRecordings();

  const isLoading =
    encounters.initState !== "Ready" || sampleRecordings.initState !== "Ready";

  const recentEncounters = encounters.list
    .filter((e) => e.recording?.transcript)
    .slice(0, 10)
    .sort(byDate((x) => new Date(x.created), "Descending"));

  const anyRecentEncounters = recentEncounters.length > 0;

  const handleChange = (id: string) => {
    const pooledRecordings = [
      ...sampleRecordings.list,
      ...recentEncounters.map((e) => e.recording!),
    ];

    const recording = pooledRecordings.find((r) => r.id === id);

    onRecordingSelected(recording);
  };

  return (
    <MobileCompatibleSelect
      className="w-full"
      isDisabled={isLoading}
      isLoading={isLoading}
      label="Audio Sample"
      labelPlacement="outside"
      renderValue={(items) =>
        items.map((item) => {
          if (item.data && "recording" in item.data) {
            const encounter = item.data as Encounter;

            return (
              <div key={item.key} className="truncate overflow-ellipse">
                <span className="text-zinc-500 text-xs text-nowrap">
                  {formatShortDatetime(new Date(encounter.created))}
                </span>
                <span className="ms-2">
                  {encounter.label ??
                    encounter.autolabel ??
                    encounter.id.toUpperCase()}
                </span>
              </div>
            );
          } else if (item.data && "filename" in item.data) {
            const sr = item.data as SampleRecording;

            return <div key={sr.id}>{sr.filename.split(".")[0]}</div>;
          } else {
            return <div key="no-selection" />;
          }
        })
      }
      selectedKeys={selectedRecording ? [selectedRecording.id] : []}
      selectionMode="single"
      onChange={(e) => handleChange(e.target.value)}
    >
      <SelectSection
        className={clsx({ hidden: !anyRecentEncounters })}
        items={recentEncounters}
        title="Recent Recordings"
      >
        {(encounter) => (
          <SelectItem key={encounter.recording!.id}>
            <div className="line-clamp-1 overflow-ellipse">
              <span className="text-zinc-500 text-xs text-nowrap">
                {formatShortDatetime(new Date(encounter.created))}
              </span>
              <span className="ms-2">
                {encounter.label ??
                  encounter.autolabel ??
                  encounter.id.toUpperCase()}
              </span>
            </div>
          </SelectItem>
        )}
      </SelectSection>
      <SelectSection
        items={sampleRecordings.list}
        title={anyRecentEncounters ? "Sample Recordings" : undefined}
      >
        {(sr) => (
          <SelectItem key={sr.id}>{sr.filename.split(".")[0]}</SelectItem>
        )}
      </SelectSection>
    </MobileCompatibleSelect>
  );
};
