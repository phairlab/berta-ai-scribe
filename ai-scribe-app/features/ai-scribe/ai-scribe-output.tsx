import { Key, useMemo } from "react";

import { Tab, Tabs } from "@heroui/tabs";

import { ErrorCard } from "@/core/error-card";
import { NoteCard } from "@/core/note-card";
import { TranscriptCard } from "@/core/transcript-card";
import { ScribeError, DraftNote, Recording, ScribeOutput } from "@/core/types";
import { byDate } from "@/utility/sorting";

type AIScribeOutputProps = {
  recording: Recording | undefined;
  notes: DraftNote[];
  error: ScribeError | undefined;
  activeOutput: ScribeOutput | undefined;
  onActiveChanged: (output: ScribeOutput | undefined) => void;
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
  const activeTab = useMemo(() => {
    let key: string = "";

    if (activeOutput) {
      if (activeOutput.type === "Error") {
        key = "error";
      } else if (activeOutput.type === "Transcript") {
        key = "transcript";
      } else if (activeOutput.type === "Note") {
        key = notes.find((n) => n.id === activeOutput.id)?.id ?? "";
      }
    } else {
      if (error) {
        key = "error";
      } else if (notes.length > 0) {
        key = notes[0].id;
      } else if (recording?.transcript) {
        key = "transcript";
      }
    }

    return key;
  }, [activeOutput, error, recording, notes]);

  function errorTabLabel(scribeError: ScribeError) {
    switch (scribeError.type) {
      case "Transcribing":
        return "ERROR: Transcription";
      case "Generating Note":
        return "ERROR: Note Generation";
      default:
        return "ERROR DETAILS";
    }
  }

  function handleSelectionChange(key: Key) {
    let output: ScribeOutput | undefined = undefined;

    if (key === "transcript") {
      output = { type: "Transcript" };
    } else if (key === "error") {
      output = { type: "Error" };
    } else {
      const id = notes.find((n) => n.id === key.toString())?.id;

      if (id) {
        output = { type: "Note", id };
      }
    }

    onActiveChanged(output);
  }

  return (
    <div className="flex flex-col w-full">
      <Tabs
        aria-label="AI Scribe Output"
        selectedKey={activeTab}
        variant="solid"
        onSelectionChange={handleSelectionChange}
      >
        {error && (
          <Tab key="error" title={errorTabLabel(error)}>
            <ErrorCard
              canDismiss={error.canDismiss}
              error={error.cause}
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
