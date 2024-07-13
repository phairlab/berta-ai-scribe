"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@nextui-org/button";
import { Select, SelectItem } from "@nextui-org/select";
import ReactMarkdown from "react-markdown";

// type TranscriptResponse = {
//   generationTime: number;
//   method: string;
//   text: string;
// };

// type SummaryResponse = {
//   generationTime: number;
//   model: string;
//   text: string;
// };

export const AIScribe = (props: { audioUrl: string }) => {
  const [transcript, setTranscript] = useState<string | null>(null);
  const [summaryType, setSummaryType] = useState("Full Visit");
  const [summary, setSummary] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

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

  async function transcribeAudio() {
    const response = await fetch(`/data/transcribe-audio`, {
      method: "POST",
      body: JSON.stringify({
        audioUrl: props.audioUrl,
      }),
    });

    const transcript = await response.json();

    setTranscript(transcript.text);
  }

  async function summarizeTranscript() {
    setIsGenerating(true);
    const response = await fetch(`/data/summarize-transcript`, {
      method: "POST",
      body: JSON.stringify({
        transcript: transcript,
        summaryType: summaryType,
      }),
    });

    if (!response.ok) {
      setSummary(
        "An error occured while generating the note.  Please try again.",
      );
      setIsGenerating(false);
    }

    const summary = await response.json();

    setSummary(summary.text);
    setIsGenerating(false);
  }

  useEffect(() => {
    transcribeAudio();
  }, []);

  return (
    <div className="flex flex-col items-center justify-center gap-8">
      <div className="flex flex-col md:flex-row items-center justify-center gap-4">
        <Button
          className="flex-none"
          color="primary"
          isLoading={!transcript || isGenerating}
          size="lg"
          onClick={summarizeTranscript}
        >
          {!transcript
            ? "Transcribing Audio"
            : isGenerating
              ? "Generating"
              : "Generate Note"}
        </Button>
        <Select
          className="flex-none md:w-64"
          defaultSelectedKeys={[summaryType]}
          label="Note Type"
          placeholder="Make a Selection"
          selectionMode="single"
          size="sm"
          onChange={(e) => setSummaryType(e.target.value)}
        >
          {summaryTypes.map((type) => (
            <SelectItem key={type}>{type}</SelectItem>
          ))}
        </Select>
      </div>
      <ReactMarkdown className="text-left pt-3.5 max-w-2xl">
        {summary}
      </ReactMarkdown>
    </div>
  );
};
