import { useContext } from "react";
import { Select, SelectItem } from "@nextui-org/select";

import { downloadFile } from "@/utility/web-api";
import { SampleRecordingsContext } from "@/contexts/sample-recordings-context";
import { useAccessToken } from "@/hooks/use-access-token";

type AudioSampleSelectProps = {
  onFileSelected: (audioData: File) => void;
};

export const AudioSampleSelect = (props: AudioSampleSelectProps) => {
  const accessToken = useAccessToken();
  const { sampleRecordings } = useContext(SampleRecordingsContext);

  const handleSampleAudioSelected = async (sample: string) => {
    const fileUrl: string = `/api/sample-recordings/${sample}`;
    const file = await downloadFile(fileUrl, sample, accessToken);

    props.onFileSelected?.(file);
  };

  return (
    <Select
      aria-label="Select an Audio Sample"
      className="w-32"
      placeholder="Use a Sample"
      selectedKeys={[]}
      selectionMode="single"
      size="sm"
      onChange={(e) => handleSampleAudioSelected(e.target.value)}
    >
      {sampleRecordings.sort().map((recording) => (
        <SelectItem key={recording.filename}>
          {recording.filename.split(".")[0]}
        </SelectItem>
      ))}
    </Select>
  );
};
