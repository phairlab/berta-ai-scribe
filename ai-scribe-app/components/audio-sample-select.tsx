import { Select, SelectItem } from "@nextui-org/select";

import { useAutoQuery } from "@/hooks/use-auto-query";
import { downloadFile } from "@/utility/network";

type AudioSampleSelectProps = {
  onFileSelected: (audioData: File) => void;
};

export const AudioSampleSelect = (props: AudioSampleSelectProps) => {
  const { data: samples, loading: samplesLoading } = useAutoQuery<string[]>(
    "/api/sample-recordings",
  );

  const handleSampleAudioSelected = async (sample: string) => {
    const fileUrl: string = `/api/sample-recordings/${sample}`;
    const file = await downloadFile(fileUrl, sample);

    props.onFileSelected?.(file);
  };

  return (
    <Select
      aria-label="Select an Audio Sample"
      className="w-32"
      isLoading={samplesLoading}
      placeholder="Use a Sample"
      selectedKeys={[]}
      selectionMode="single"
      size="sm"
      onChange={(e) => handleSampleAudioSelected(e.target.value)}
    >
      {(samples ?? [])
        ?.sort()
        .map((sample) => (
          <SelectItem key={sample}>{sample.split(".")[0]}</SelectItem>
        ))}
    </Select>
  );
};
