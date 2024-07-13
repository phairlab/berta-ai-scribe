"use client";

import { Button } from "@nextui-org/button";
import React, { useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { MicrophoneIcon } from "./icons";
import { AudioPlayer } from "./audio-player";

export const AudioRecorder = () => {
  const router = useRouter();
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordedUrl, setRecordedUrl] = useState("");
  const mediaStream = useRef<MediaStream | null>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);

  const startRecording = async () => {
    setIsRecording(true);
    chunks.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      mediaStream.current = stream;
      mediaRecorder.current = new MediaRecorder(stream, {
        mimeType: "audio/webm",
      });
      mediaRecorder.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.current.push(e.data);
        }
      };
      mediaRecorder.current.onstop = () => {
        const recordedBlob = new Blob(chunks.current, { type: "audio/webm" });
        const url = URL.createObjectURL(recordedBlob);

        setRecordedUrl(url);
      };
      mediaRecorder.current.start();
    } catch (error) {
      console.error("Error accessing microphone:", error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && mediaRecorder.current.state === "recording") {
      mediaRecorder.current.stop();
    }
    if (mediaStream.current) {
      mediaStream.current.getTracks().forEach((track) => {
        track.stop();
      });
    }
    setIsRecording(false);
  };

  const saveAudio = async () => {
    if (!recordedUrl) {
      return;
    }

    const formData = new FormData();
    const fileData = new Blob(chunks.current, { type: "audio/webm" });

    formData.append("recording", fileData, "audio.webm");
    formData.append("type", "webm");

    const response = await fetch(`/data/save-audio-file`, {
      method: "POST",
      body: formData,
    });

    const data = await response.json();
    const id = data.id;

    router.push(`/patient-conversations/${id}`);
  };

  return (
    <div className="flex flex-col items-center justify-center gap-4 w-auto">
      <Button
        isIconOnly
        className={`w-24 h-24 ${isRecording ? "bg-red-400 border border-red-600" : ""}`}
        radius="full"
        size="lg"
        variant="shadow"
        onClick={isRecording ? stopRecording : startRecording}
      >
        <MicrophoneIcon />
      </Button>
      {/* <audio controls src={recordedUrl} /> */}
      <div className="w-full max-w-3xl">
        <AudioPlayer audioUrl={recordedUrl} />
      </div>
      <Button
        className={`${!recordedUrl || isRecording ? "hidden" : ""}`}
        onClick={saveAudio}
      >
        Save & Continue
      </Button>
    </div>
  );
};
