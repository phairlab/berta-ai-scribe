"use client";

import { useEffect, useState } from "react";
import { Divider } from "@nextui-org/divider";
import { Spinner } from "@nextui-org/spinner";
import { Button } from "@nextui-org/button";
import { Select, SelectItem } from "@nextui-org/select";
import { Card, CardBody, CardHeader } from "@nextui-org/card";

import { AudioSelector } from "./audio-selector";

import * as actions from "@/app/actions";

type GeneratedNote = {
  text: string;
  type: string;
};

export const AIScribe = () => {
  const [audioData, setAudioData] = useState<Blob | null>(null);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [summaryType, setSummaryType] = useState<string>("Full Visit");
  const [generatedNote, setGeneratedNote] = useState<GeneratedNote | null>(
    null,
  );
  const [isNoteGenerating, setIsNoteGenerating] = useState(false);

  const summaryTypes = [
    "Dx and DDx",
    "Feedback",
    "Full Visit",
    "Hallway Consult",
    "Handover Note",
    "Impression Note",
    "Medications",
    "Psych",
  ];

  useEffect(() => {
    // Reset values.
    setTranscript(null);
    setGeneratedNote(null);
    setIsNoteGenerating(false);
    setSummaryType("Full Visit");

    // Transcribe new audio.
    transcribeAudio();
  }, [audioData]);

  const transcribeAudio = async () => {
    if (audioData) {
      const extension = audioData.type.split(";")[0].split("/")[1] || "webm";
      const filename = `recording.${extension}`;
      const formData = new FormData();

      formData.append("recording", audioData, filename);
      const transcript = await actions.transcribeAudio(formData);

      setTranscript(transcript.text);
    }
  };

  const generateNote = async () => {
    setGeneratedNote(null);
    if (transcript) {
      setIsNoteGenerating(true);
      const note = await actions.generateNote(transcript, summaryType);

      setGeneratedNote({ text: note.text, type: summaryType });
      setIsNoteGenerating(false);
    }
  };

  const copyNote = async () => {
    if (generatedNote) {
      await navigator.clipboard.writeText(generatedNote.text);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <AudioSelector onAudioDataChanged={setAudioData} />
      {audioData && (
        <div className="flex flex-col gap-6">
          <Divider />
          <div className="flex flex-row items-center justify-center gap-4">
            <Select
              className="flex-none w-40"
              defaultSelectedKeys={[summaryType]}
              placeholder="Make a Selection"
              selectionMode="single"
              size="md"
              onChange={(e) => setSummaryType(e.target.value)}
            >
              {summaryTypes.map((type) => (
                <SelectItem key={type}>{type}</SelectItem>
              ))}
            </Select>
            <Button
              className="flex-none"
              color="primary"
              isDisabled={!transcript}
              size="md"
              onClick={generateNote}
            >
              Generate Note
            </Button>
          </div>
          {!transcript && (
            <div className="flex flex-row gap-4 justify-center items-center">
              <Spinner color="default" size="md" />
              <span className="text-zinc-500">Transcribing Audio</span>
            </div>
          )}
          {isNoteGenerating && (
            <div className="flex flex-row gap-4 justify-center items-center">
              <Spinner color="default" size="md" />
              <span className="text-zinc-500">Generating Note</span>
            </div>
          )}
          {generatedNote && (
            <div className="flex flex-col justify-center gap-6">
              <Divider />
              <Card radius="sm" shadow="sm">
                <CardHeader className="flex flex-row gap-4 justify-between items-center">
                  <p className="text-lg font-semibold">{generatedNote.type}</p>
                  <Button color="default" size="sm" onClick={copyNote}>
                    Copy
                  </Button>
                </CardHeader>
                <Divider />
                <CardBody>
                  <p className="text-left max-w-2xl whitespace-pre-wrap">
                    {generatedNote.text}
                  </p>
                </CardBody>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
