import clsx from "clsx";

import { SelectItem, SelectSection } from "@nextui-org/select";

import { MobileCompatibleSelect } from "@/core/mobile-compatible-select";
import { Recording, SampleRecording } from "@/core/types";
import { useEncounters } from "@/services/application-state/encounters-context";
import { useSampleRecordings } from "@/services/application-state/sample-recordings-context";
import { formatDatetime } from "@/utility/formatting";

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
    .slice(0, 10);

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
      selectedKeys={selectedRecording ? [selectedRecording.id] : []}
      selectionMode="single"
      onChange={(e) => handleChange(e.target.value)}
    >
      <SelectSection
        className={clsx({ hidden: !anyRecentEncounters })}
        title="Recent Recordings"
      >
        {recentEncounters.map((encounter) => (
          <SelectItem key={encounter.recording!.id}>
            {`${formatDatetime(new Date(encounter.created))}${encounter.label ? ` (${encounter.label.toUpperCase()})` : ""}`}
          </SelectItem>
        ))}
      </SelectSection>
      <SelectSection
        title={anyRecentEncounters ? "Sample Recordings" : undefined}
      >
        {sampleRecordings.list.map((sr) => (
          <SelectItem key={sr.id}>{sr.filename.split(".")[0]}</SelectItem>
        ))}
      </SelectSection>
    </MobileCompatibleSelect>
  );
};
