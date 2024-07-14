import { Card, CardBody } from "@nextui-org/card";

import { MicrophoneIcon, FileUploadIcon, AudioFilesIcon } from "./icons";

export const AudioSelector = () => {
  const audio_options = [
    {
      title: "Record",
      description: "Record a conversation using your device's microphone.",
      icon: (className: string, size: number) => (
        <MicrophoneIcon className={className} size={size} />
      ),
    },
    {
      title: "Upload",
      description: "Browse for an existing audio file on your device.",
      icon: (className: string, size: number) => (
        <FileUploadIcon className={className} size={size} />
      ),
    },
    {
      title: "Samples",
      description: "Test using a selection of sample audio files.",
      icon: (className: string, size: number) => (
        <AudioFilesIcon className={className} size={size} />
      ),
    },
  ];

  return (
    <div className="flex flex-row gap-3 md:gap-8 w-full justify-evenly md:justify-center">
      {audio_options.map((option) => (
        <Card
          key={option.title}
          isHoverable
          isPressable
          className={`w-24 md:w-auto min-w-24 md:max-w-72 basis-1/${audio_options.length}`}
        >
          <CardBody>
            <div className="flex flex-col-reverse md:flex-row h-full md:gap-2">
              <div className="my-auto mx-auto">
                {option.icon(
                  "dark:fill-zinc-300 dark:stroke-zinc-300 m-auto",
                  60,
                )}
              </div>
              <div className="flex flex-col gap-2">
                <h4 className="text-medium md:text-large text-center md:text-left md:font-semibold">
                  {option.title}
                </h4>
                <p className="hidden md:flex text-left text-small text-default-600 h-full">
                  {option.description}
                </p>
              </div>
            </div>
          </CardBody>
        </Card>
      ))}
    </div>
  );
};
