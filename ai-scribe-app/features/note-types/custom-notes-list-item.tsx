import clsx from "clsx";

import { Divider } from "@nextui-org/divider";
import { Link } from "@nextui-org/link";

import { NoteType } from "@/core/types";
import { WaitMessageSpinner } from "@/core/wait-message-spinner";

type CustomNotesListItemProps = {
  noteType: NoteType;
  isBeingEdited: boolean;
  canDelete: boolean;
  onEdit: () => void;
  onDelete: () => void;
};

export const CustomNotesListItem = ({
  noteType,
  isBeingEdited,
  canDelete,
  onEdit,
  onDelete,
}: CustomNotesListItemProps) => (
  <div key={noteType.uuid} className="flex flex-row gap-2 h-5">
    <div
      className={clsx("basis-full text-start self-stretch w-[300px] ps-2 h-7", {
        "border-s-4 border-blue-500": isBeingEdited,
      })}
    >
      {noteType.title}
    </div>
    {noteType.tracking.isSaving ? (
      <WaitMessageSpinner size="sm">Saving</WaitMessageSpinner>
    ) : (
      <div className="flex flex-row gap-2 h-5">
        <Link className="text-sm" href="#" onClick={onEdit}>
          Edit
        </Link>
        <Divider orientation="vertical" />
        <Link
          className="text-sm"
          href="#"
          isDisabled={!canDelete}
          onClick={onDelete}
        >
          Delete
        </Link>
      </div>
    )}
  </div>
);
