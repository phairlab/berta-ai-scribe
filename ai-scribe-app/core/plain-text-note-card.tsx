import { Button } from "@nextui-org/button";

import { OutputCard } from "./output-card";
import { DraftNote } from "./types";
import { NoteQAFlag } from "@/features/user-feedback/note-qa-flag";

type PlainTextNoteCardProps = {
  note: DraftNote;
  canFlag?: boolean;
  onFlagSet?: (comments: string | null) => void;
  onFlagUnset?: () => void;
};

export const PlainTextNoteCard = ({ note, canFlag = true, onFlagSet, onFlagUnset }: PlainTextNoteCardProps) => {
  const copyNote = async () => {
    if (note.content) {
      await navigator.clipboard.writeText(note.content);
    }
  };

  const controls = (
    <div className="flex flex-col gap-3 sm:gap-2 w-full">
      <div className="flex flex-row justify-between items-center gap-4 w-full">
        {canFlag ? (
          <NoteQAFlag
            note={note}
            onFlagSet={onFlagSet}
            onFlagUnset={onFlagUnset}
          />
        ) : (
          <div />
        )}
        <Button color="default" size="sm" onClick={copyNote}>
          Copy
        </Button>
      </div>
      {note.qaComments && (
        <div className="text-xs text-zinc-500 px-6 line-clamp-2 text-ellipsis" title={note.qaComments}>{note.qaComments}</div>
      )}
    </div>
  );

  return (
    <OutputCard controls={controls}>
      {note.content.replace(/^###.*###\n/g, "")}
    </OutputCard>
  );
};
