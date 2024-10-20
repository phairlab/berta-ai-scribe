import { Key, useEffect, useState } from "react";

import { Tab, Tabs } from "@nextui-org/tabs";

import { ErrorCard } from "@/core/error-card";
import { NoteCard } from "@/core/note-card";
import { TranscriptCard } from "@/core/transcript-card";
import { DraftNote, Recording } from "@/core/types";
import { ApplicationError, isApplicationError } from "@/utility/errors";

export type AIScribeError = {
  name: string;
  content: ApplicationError;
  canDismiss: boolean;
  retry: () => void;
};

export type AIScribeOutputType = Recording | DraftNote | AIScribeError;

type AIScribeOutputProps = {
  recording: Recording;
  notes: DraftNote[];
  error: AIScribeError | undefined;
  activeOutput: AIScribeOutputType | undefined;
  onActiveChanged: (output: AIScribeOutputType | undefined) => void;
  onErrorDismissed: () => void;
};

export const AIScribeOutput = ({
  recording,
  notes,
  error,
  activeOutput,
  onActiveChanged,
  onErrorDismissed,
}: AIScribeOutputProps) => {
  const [activeTab, setActiveTab] = useState<string>("");

  function isError(output: AIScribeOutputType): output is AIScribeError {
    return "content" in output && isApplicationError(output.content);
  }

  function isRecording(output: AIScribeOutputType): output is Recording {
    return "filename" in output && "transcript" in output;
  }

  function isNote(output: AIScribeOutputType): output is DraftNote {
    return "tag" in output;
  }

  useEffect(() => {
    const key: string | undefined = !activeOutput
      ? undefined
      : isError(activeOutput)
        ? "error"
        : isRecording(activeOutput)
          ? "transcript"
          : isNote(activeOutput)
            ? notes.find((n) => n.tag === activeOutput.tag)?.tag
            : undefined;

    if (activeTab !== key) {
      setActiveTab(key ?? "");
    }
  }, [activeOutput, error, recording, notes]);

  const handleSelectionChange = (key: Key) => {
    const output =
      key === "transcript"
        ? recording
        : key === "error"
          ? error
          : notes.find((n) => n.tag === key.toString());

    onActiveChanged(output);
  };

  return (
    <div className="flex flex-col w-full">
      <Tabs
        aria-label="AI Scribe Output"
        classNames={{
          tabList: "overflow-x-auto",
        }}
        selectedKey={activeTab}
        variant="solid"
        onSelectionChange={handleSelectionChange}
      >
        {error && (
          <Tab key="error" className="text-red-500" title={`${error.name}`}>
            <ErrorCard
              canDismiss={error.canDismiss}
              error={error.content}
              retryAction={error.retry}
              onDismiss={onErrorDismissed}
            />
          </Tab>
        )}
        {notes.map((note) => (
          <Tab key={note.tag} title={note.title}>
            <NoteCard note={note} showTitle={false} />
          </Tab>
        ))}
        {recording.transcript && (
          <Tab key="transcript" title="Transcript">
            <TranscriptCard recording={recording} showTitle={false} />
          </Tab>
        )}
      </Tabs>
    </div>
  );
};
