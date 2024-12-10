import clsx from "clsx";

import { Link } from "@nextui-org/link";

import { FlagIcon } from "@/core/icons";
import { DraftNote } from "@/core/types";

import { FlagNoteDropdown } from "./flag-note-dropdown";

type FlagNoteButtonProps = {
  note: DraftNote;
  onFlagSet?: (comments: string | null) => void;
  onFlagUnset?: () => void;
};

export const FlagNoteButton = ({
  note,
  onFlagSet,
  onFlagUnset,
}: FlagNoteButtonProps) => {
  return (
    <FlagNoteDropdown
      note={note}
      onFlagSet={onFlagSet}
      onFlagUnset={onFlagUnset}
    >
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
              : "stroke-zinc-400 dark:text-zinc-600",
          )}
          size={18}
        />
        <span className="text-sm">{note.isFlagged ? "Flagged" : "Flag"}</span>
      </Link>
    </FlagNoteDropdown>
  );
};
