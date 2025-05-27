import clsx from "clsx";

import { Divider } from "@heroui/divider";

import { LinkButton } from "@/core/link-button";
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
  <div key={noteType.id} className="flex flex-row gap-5">
    <div
      className={clsx(
        "basis-full text-sm sm:text-base text-start truncate w-full text-ellipsis self-stretch w-[300px] ps-2 py-1",
        {
          "border-s-4 border-blue-500": isBeingEdited,
        },
      )}
      title={noteType.title}
    >
      {noteType.title}
    </div>
    {noteType.isSaving ? (
      <WaitMessageSpinner size="sm">Saving</WaitMessageSpinner>
    ) : (
      <div className="flex flex-row gap-2 items-center">
        <LinkButton className="text-primary text-sm" onPress={onEdit}>
          Edit
        </LinkButton>
        <Divider className="h-[70%]" orientation="vertical" />
        <LinkButton
          className="text-primary text-sm"
          isDisabled={!canDelete}
          onPress={onDelete}
        >
          Delete
        </LinkButton>
      </div>
    )}
  </div>
);
