import { Dispatch, SetStateAction } from "react";
import { Card, CardBody } from "@nextui-org/card";

import { MicrophoneIcon, FileUploadIcon, AudioFilesIcon } from "./icons";

import { AudioSourceType } from "@/types";

interface AudioSelectorProps {
  mobileDevice: boolean;
  source?: AudioSourceType;
  onSourceSelected?: Dispatch<SetStateAction<AudioSourceType>>;
}

const cardClassNames = (
  source: AudioSourceType,
  selectedSource: AudioSourceType | undefined,
  mobileDevice: boolean,
) => {
  const isSelected = source == selectedSource;
  const hideOnSmallScreens = source == "upload";
  let classes: string[] = ["max-w-64"];

  if (isSelected) {
    classes.push("border", "border-blue-400");
  }

  if (hideOnSmallScreens) {
    classes.push("hidden", "sm:flex", "sm:basis-1/3");
  } else if (mobileDevice) {
    classes.push("basis-1/2");
  } else {
    classes.push("basis-1/2", "sm:basis-1/3");
  }

  return classes.join(" ");
};

export const AudioSource = ({
  mobileDevice,
  source,
  onSourceSelected,
}: AudioSelectorProps) => {
  return (
    <div className="flex flex-row gap-4 md:gap-8 justify-center">
      <Card
        isPressable
        className={cardClassNames("recording", source, mobileDevice)}
        isHoverable={source != "recording"}
        onPress={() => onSourceSelected?.("recording")}
      >
        <CardBody>
          <div className="grid grid-flow-dense sm:grid-cols-2 sm:grid-cols-[min-content_auto] justify-items-center sm:justify-items-start gap-1 h-full">
            <MicrophoneIcon
              className="sm:row-span-2 dark:fill-zinc-300 my-auto"
              size={60}
            />
            <h4 className="text-large font-semibold">Record</h4>
            <p className="text-center sm:text-left text-small text-default-600">
              Record a conversation using your device&apos;s microphone.
            </p>
          </div>
        </CardBody>
      </Card>
      {!mobileDevice && (
        <Card
          isPressable
          className={cardClassNames("upload", source, mobileDevice)}
          isHoverable={source != "upload"}
          onPress={() => onSourceSelected?.("upload")}
        >
          <CardBody>
            <div className="grid grid-flow-dense sm:grid-cols-2 sm:grid-cols-[min-content_auto] justify-items-center sm:justify-items-start gap-1 h-full">
              <FileUploadIcon
                className="sm:row-span-2 dark:fill-zinc-300 my-auto"
                size={60}
              />
              <h4 className="text-large font-semibold">Upload</h4>
              <p className="text-center sm:text-left text-small text-default-600">
                Browse for an existing audio file.
              </p>
            </div>
          </CardBody>
        </Card>
      )}
      <Card
        isPressable
        className={cardClassNames("sample", source, mobileDevice)}
        isHoverable={source != "sample"}
        onPress={() => onSourceSelected?.("sample")}
      >
        <CardBody>
          <div className="grid grid-flow-dense sm:grid-cols-2 sm:grid-cols-[min-content_auto] justify-items-center sm:justify-items-start gap-1 h-full">
            <AudioFilesIcon
              className="sm:row-span-2 dark:fill-zinc-300 my-auto"
              size={60}
            />
            <h4 className="text-large font-semibold">Samples</h4>
            <p className="text-center sm:text-left text-small text-default-600">
              Test using a selection of sample audio files.
            </p>
          </div>
        </CardBody>
      </Card>
    </div>
  );
};
