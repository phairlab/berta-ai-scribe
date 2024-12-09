import { Link } from "@nextui-org/link";

import { FlagIcon } from "@/core/icons";

type NoteFlagProps = {
  isFlagged: boolean;
  comments: string | null;
};

export const NoteFlag = ({ isFlagged, comments }: NoteFlagProps) => {
  return isFlagged ? (
    <div className="flex flex-row items-center gap-2">
      <FlagIcon className="stroke-amber-600 dark:stroke-amber-400" size={18} />
      <span className="text-sm text-amber-600 dark:text-amber-400">
        {comments}
      </span>
    </div>
  ) : (
    <Link className="flex flex-row items-center gap-2 text-zinc-500 cursor-pointer">
      <FlagIcon className="stroke-zinc-500" size={18} />
      <span className="text-sm">Flag this Note</span>
    </Link>
  );
};
