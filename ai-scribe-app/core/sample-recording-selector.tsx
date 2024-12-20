import { SelectItem } from "@nextui-org/select";

import { MobileCompatibleSelect } from "@/core/mobile-compatible-select";
import { useSampleRecordings } from "@/services/application-state/sample-recordings-context";

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
    <MobileCompatibleSelect
      aria-label="Select an Audio Sample"
      className="w-32"
      isDisabled={sampleRecordings.initState !== "Ready"}
      isLoading={sampleRecordings.initState === "Initializing"}
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
    </MobileCompatibleSelect>
  );
};
