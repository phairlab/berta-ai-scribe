"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Card, CardBody } from "@nextui-org/card";

import { MicrophoneIcon, FileUploadIcon, AudioFilesIcon } from "./icons";

export const AudioSelector = () => {
  const pathname = usePathname();

  const audioOptions = [
    {
      title: "Record",
      description: "Record a conversation using your device's microphone.",
      icon: (className: string, size: number) => (
        <MicrophoneIcon className={className} size={size} />
      ),
      href: "/record-audio",
    },
    {
      title: "Upload",
      description: "Browse for an existing audio file on your device.",
      icon: (className: string, size: number) => (
        <FileUploadIcon className={className} size={size} />
      ),
      href: "/upload-audio-file",
    },
    {
      title: "Samples",
      description: "Test using a selection of sample audio files.",
      icon: (className: string, size: number) => (
        <AudioFilesIcon className={className} size={size} />
      ),
      href: "/select-audio-sample",
    },
  ];

  return (
    <div className="flex flex-row gap-3 md:gap-8 w-full justify-evenly md:justify-center">
      {audioOptions.map((option) => (
        <Link key={option.title} href={option.href ?? ""}>
          <Card
            isHoverable
            isPressable
            className={`w-24 md:w-auto min-w-24 md:max-w-72 basis-1/${audioOptions.length} ${pathname === option.href ? "border border-blue-400" : ""}`}
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
        </Link>
      ))}
    </div>
  );
};
