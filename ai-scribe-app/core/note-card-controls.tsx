import { ReactNode } from "react";

import { FlagNoteButton } from "@/features/user-feedback/flag-note-button";

import { DraftNote } from "./types";

type NoteCardControlsProps = {
  note: DraftNote;
  canFlag: boolean;
  outputControls: ReactNode;
  onFlagSet?: (comments: string | null) => void;
  onFlagUnset?: () => void;
};

export const NoteCardControls = ({
  note,
  canFlag,
  outputControls,
  onFlagSet,
  onFlagUnset,
}: NoteCardControlsProps) => (
  <div className="flex flex-col gap-3 sm:gap-2 w-full">
    <div className="flex flex-row justify-between items-center gap-4 w-full">
      {canFlag ? (
        <FlagNoteButton
          note={note}
          onFlagSet={onFlagSet}
          onFlagUnset={onFlagUnset}
        />
      ) : (
        <div />
      )}
      {outputControls}
    </div>
    {note.comments && (
      <div
        className="text-xs text-zinc-500 px-6 line-clamp-2 text-ellipsis"
        title={note.comments}
      >
        {note.comments}
      </div>
    )}
  </div>
);
