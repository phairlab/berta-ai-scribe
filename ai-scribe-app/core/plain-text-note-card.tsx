import { Button } from "@nextui-org/button";

import { NoteCardControls } from "./note-card-controls";
import { OutputCard } from "./output-card";
import { DraftNote } from "./types";

type PlainTextNoteCardProps = {
  note: DraftNote;
  canFlag?: boolean;
  onFlagSet?: (comments: string | null) => void;
  onFlagUnset?: () => void;
};

export const PlainTextNoteCard = ({
  note,
  canFlag = true,
  onFlagSet,
  onFlagUnset,
}: PlainTextNoteCardProps) => {
  const copyNote = async () => {
    if (note.content) {
      await navigator.clipboard.writeText(note.content);
    }
  };

  const outputControls = (
    <Button color="default" size="sm" onClick={copyNote}>
      Copy
    </Button>
  );

  const controls = (
    <NoteCardControls
      canFlag={canFlag}
      note={note}
      outputControls={outputControls}
      onFlagSet={onFlagSet}
      onFlagUnset={onFlagUnset}
    />
  );

  return (
    <OutputCard controls={controls}>
      {note.content.replace(/^###.*###\n/g, "")}
    </OutputCard>
  );
};
