import { Key, useEffect, useState } from "react";

import { Tab, Tabs } from "@nextui-org/tabs";

import { ErrorCard } from "@/core/error-card";
import { NoteCard } from "@/core/note-card";
import { TranscriptCard } from "@/core/transcript-card";
import { DraftNote, Recording } from "@/core/types";
import { ApplicationError, isApplicationError } from "@/utility/errors";
import { byDate } from "@/utility/sorting";

export type AIScribeError = {
  name: string | null;
  content: ApplicationError;
  canDismiss: boolean;
  retry: (() => void) | null;
};

export type AIScribeOutputType = Recording | DraftNote | AIScribeError;

type AIScribeOutputProps = {
  recording: Recording | undefined;
  notes: DraftNote[];
  error: AIScribeError | undefined;
  activeOutput: AIScribeOutputType | undefined;
  onActiveChanged: (output: AIScribeOutputType | undefined) => void;
  onErrorDismissed: () => void;
  onNoteFlagUpdated: (
    note: DraftNote,
    isFlagged: boolean,
    comment: string | null,
  ) => void;
};

export const AIScribeOutput = ({
  recording,
  notes,
  error,
  activeOutput,
  onActiveChanged,
  onErrorDismissed,
  onNoteFlagUpdated,
}: AIScribeOutputProps) => {
  const [activeTab, setActiveTab] = useState<string>("");

  function isError(output: AIScribeOutputType): output is AIScribeError {
    return "content" in output && isApplicationError(output.content);
  }

  function isRecording(output: AIScribeOutputType): output is Recording {
    return "transcript" in output;
  }

  function isNote(output: AIScribeOutputType): output is DraftNote {
    return "definitionId" in output;
  }

  useEffect(() => {
    const key: string | undefined = !activeOutput
      ? undefined
      : isError(activeOutput)
        ? "error"
        : isRecording(activeOutput)
          ? "transcript"
          : isNote(activeOutput)
            ? notes.find((n) => n.id === activeOutput.id)?.id
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
          : notes.find((n) => n.id === key.toString());

    onActiveChanged(output);
  };

  return (
    <div className="flex flex-col w-full">
      <Tabs
        aria-label="AI Scribe Output"
        selectedKey={activeTab}
        variant="solid"
        onSelectionChange={handleSelectionChange}
      >
        {error && (
          <Tab
            key="error"
            title={
              error.name ? `ERROR DETAILS: ${error.name}` : "ERROR DETAILS"
            }
          >
            <ErrorCard
              canDismiss={error.canDismiss}
              error={error.content}
              retryAction={error.retry}
              onDismiss={onErrorDismissed}
            />
          </Tab>
        )}
        {notes
          .sort(byDate((n) => new Date(n.created), "Descending"))
          .map((note) => (
            <Tab key={note.id} title={note.title}>
              <NoteCard
                note={note}
                onFlagSet={(comments) =>
                  onNoteFlagUpdated(note, true, comments)
                }
                onFlagUnset={() => onNoteFlagUpdated(note, false, null)}
              />
            </Tab>
          ))}
        {recording !== undefined && recording.transcript !== null && (
          <Tab key="transcript" title="Transcript">
            <TranscriptCard recording={recording} showTitle={false} />
          </Tab>
        )}
      </Tabs>
    </div>
  );
};
