import { Select, SelectItem } from "@nextui-org/select";

import { useAccessToken } from "@/services/session-management/use-access-token";
import { downloadFile } from "@/services/web-api/base-queries";

import { useSampleRecordings } from "./use-sample-recordings";

type SampleRecordingSelectorProps = {
  onFileSelected: (audioData: File) => void;
};

export const SampleRecordingSelector = ({
  onFileSelected,
}: SampleRecordingSelectorProps) => {
  const { accessToken } = useAccessToken();
  const sampleRecordings = useSampleRecordings();

  const handleSelectionChange = async (sample: string) => {
    const fileUrl: string = `/api/sample-recordings/${sample}`;
    const file = await downloadFile(fileUrl, sample, accessToken);

    onFileSelected?.(file);
  };

  return (
    <Select
      aria-label="Select an Audio Sample"
      className="w-32"
      isDisabled={!sampleRecordings.isFetched}
      isLoading={!sampleRecordings.isFetched}
      placeholder="Use a Sample"
      selectedKeys={[]}
      selectionMode="single"
      size="sm"
      onChange={(e) => handleSelectionChange(e.target.value)}
    >
      {sampleRecordings.state.sort().map((recording) => (
        <SelectItem key={recording.filename}>
          {recording.filename.split(".")[0]}
        </SelectItem>
      ))}
    </Select>
  );
};
