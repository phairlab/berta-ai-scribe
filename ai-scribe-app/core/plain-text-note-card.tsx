import { Button } from "@nextui-org/button";

import { OutputCard } from "./output-card";
import { DraftNote } from "./types";

type PlainTextNoteCardProps = {
  note: DraftNote;
};

export const PlainTextNoteCard = ({ note }: PlainTextNoteCardProps) => {
  const copyNote = async () => {
    if (note.content) {
      await navigator.clipboard.writeText(note.content);
    }
  };

  const controls = (
    <Button className="ms-auto" color="default" size="sm" onClick={copyNote}>
      Copy
    </Button>
  );

  return (
    <OutputCard controls={controls}>
      {note.content.replace(/^###.*###\n/g, "")}
    </OutputCard>
  );
};
