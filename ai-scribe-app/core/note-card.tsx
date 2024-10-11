import { Button } from "@nextui-org/button";

import { OutputCard } from "./output-card";
import { DraftNote } from "./types";

type NoteCardProps = {
  note: DraftNote;
  showTitle?: boolean;
};

export const NoteCard = ({ note, showTitle = true }: NoteCardProps) => {
  const copyNote = async () => {
    if (note.text) {
      await navigator.clipboard.writeText(note.text);
    }
  };

  const controls = (
    <Button color="default" size="sm" onClick={copyNote}>
      Copy
    </Button>
  );

  return (
    <OutputCard controls={controls} title={showTitle && note.title}>
      {note.text}
    </OutputCard>
  );
};
