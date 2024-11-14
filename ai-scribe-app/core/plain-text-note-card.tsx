import { Button } from "@nextui-org/button";

import { OutputCard } from "./output-card";
import { DraftNote } from "./types";

type PlainTextNoteCardProps = {
  note: DraftNote;
  showTitle?: boolean;
};

export const PlainTextNoteCard = ({
  note,
  showTitle = true,
}: PlainTextNoteCardProps) => {
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
      {note.content.replace(/^###.*###\n/g, "")}
    </OutputCard>
  );
};
