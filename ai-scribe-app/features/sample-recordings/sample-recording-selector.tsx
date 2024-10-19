import { SelectItem } from "@nextui-org/select";

import { SafeSelect } from "@/core/safe-select";

import { useSampleRecordings } from "./use-sample-recordings";

type SampleRecordingSelectorProps = {
  onFileSelected: (audioData: File) => void;
};

export const SampleRecordingSelector = ({
  onFileSelected,
}: SampleRecordingSelectorProps) => {
  const sampleRecordings = useSampleRecordings();

  const handleSelectionChange = async (filename: string) => {
    const file = await sampleRecordings.download(filename);

    onFileSelected?.(file);
  };

  return (
    <SafeSelect
      aria-label="Select an Audio Sample"
      className="w-32"
      isDisabled={!sampleRecordings.isReady}
      isLoading={!sampleRecordings.isReady}
      placeholder="Use a Sample"
      selectedKeys={[]}
      selectionMode="single"
      size="sm"
      onChange={(e) => handleSelectionChange(e.target.value)}
    >
      {sampleRecordings.list.map((recording) => (
        <SelectItem key={recording.filename}>
          {recording.filename.split(".")[0]}
        </SelectItem>
      ))}
    </SafeSelect>
  );
};
