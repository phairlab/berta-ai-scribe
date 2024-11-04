import { Button } from "@nextui-org/button";

import { OutputCard } from "./output-card";
import { DraftNote } from "./types";

type NoteCardProps = {
  note: DraftNote;
  showTitle?: boolean;
};

export const NoteCard = ({ note, showTitle = true }: NoteCardProps) => {
  const copyNote = async () => {
    if (note.content) {
      await navigator.clipboard.writeText(note.content);
    }
  };

  const controls = (
    <Button color="default" size="sm" onClick={copyNote}>
      Copy
    </Button>
  );

  return (
    <OutputCard controls={controls} title={showTitle && note.title}>
      {note.content}
    </OutputCard>
  );
};
