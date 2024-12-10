import clsx from "clsx";

import { Link } from "@nextui-org/link";

import { FlagIcon } from "@/core/icons";
import { DraftNote } from "@/core/types";

import { NoteQADropdown } from "./note-qa-dropdown";

type NoteFlagProps = {
  note: DraftNote;
  onFlagSet?: (comments: string | null) => void;
  onFlagUnset?: () => void;
};

export const NoteQAFlag = ({ note, onFlagSet, onFlagUnset }: NoteFlagProps) => {
  return (
    <NoteQADropdown note={note} onFlagSet={onFlagSet} onFlagUnset={onFlagUnset}>
      <Link
        className={clsx(
          "flex flex-row justify-center items-center gap-2 cursor-pointer",
          note.isFlagged
            ? "text-amber-600 dark:text-amber-400"
            : "text-zinc-500",
        )}
      >
        <FlagIcon
          className={clsx(
            note.isFlagged
              ? "stroke-amber-600 dark:stroke-amber-400"
              : "stroke-zinc-500",
          )}
          size={18}
        />
        <span className="text-sm hidden sm:inline-block">
          {note.isFlagged ? "Flagged" : "Flag"} for QA
        </span>
        <span className="text-sm inline-block sm:hidden">
          {note.isFlagged ? "Flagged" : "Flag"}
        </span>
      </Link>
    </NoteQADropdown>
  );
};
