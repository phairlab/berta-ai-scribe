"use client";

import React, { useState } from "react";
import { Button } from "@nextui-org/button";
import { Select, SelectItem } from "@nextui-org/select";
import ReactMarkdown from "react-markdown";
import { ScrollShadow } from "@nextui-org/scroll-shadow";

type AINoteData = {
  audio: {
    duration: number;
    fileSize: number;
  };
  transcript: {
    generationTime: number;
    method: string;
    text: string;
  };
  generatedNote: {
    generationTime: number;
    model: string;
    text: string;
  };
};

export const AIScribe = (props: { conversationId: string }) => {
  const [noteType, setNoteType] = useState("Full Visit");
  const [aiNoteData, setAINoteData] = useState<AINoteData | null>(null);

  const noteTypes = [
    "Dx and DDx",
    "Feedback",
    "Full Visit",
    "Hallway Consult",
    "Handover Note",
    "Impression Note",
    "Medications",
    "Psych",
  ];

  const getNote = async () => {
    const response = await fetch(
      `/data/get-note?id=${props.conversationId}&noteType=${noteType}`,
    );

    const data = await response.json();

    setAINoteData(data);
  };

  return (
    <div className="flex flex-col items-center justify-center gap-8">
      <div className="flex flex-col md:flex-row items-center justify-center gap-4">
        <Select
          className="flex-none md:w-64"
          defaultSelectedKeys={[noteType]}
          label="Note Type"
          placeholder="Make a Selection"
          selectionMode="single"
          size="sm"
          onChange={(e) => setNoteType(e.target.value)}
        >
          {noteTypes.map((noteType) => (
            <SelectItem key={noteType}>{noteType}</SelectItem>
          ))}
        </Select>
        <Button
          className="flex-none"
          color="primary"
          size="lg"
          onClick={getNote}
        >
          Transcribe & Generate Note
        </Button>
      </div>
      <ScrollShadow className="max-h-[400px] overscroll-auto">
        <ReactMarkdown className="text-left max-w-2xl">
          {aiNoteData?.generatedNote.text}
        </ReactMarkdown>
      </ScrollShadow>
    </div>
  );
};
