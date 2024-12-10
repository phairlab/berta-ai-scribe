"use client";

import {
  KeyboardEventHandler,
  PropsWithChildren,
  useEffect,
  useRef,
  useState,
} from "react";

import clsx from "clsx";

import { Button } from "@nextui-org/button";
import { Divider } from "@nextui-org/divider";
import { Textarea } from "@nextui-org/input";
import { Popover, PopoverContent, PopoverTrigger } from "@nextui-org/popover";

import { DraftNote } from "@/core/types";

type FlagNoteDropdownProps = PropsWithChildren<{
  note: DraftNote;
  onFlagSet?: (comments: string | null) => void;
  onFlagUnset?: () => void;
}>;

export const FlagNoteDropdown = ({
  children,
  note,
  onFlagSet,
  onFlagUnset,
}: FlagNoteDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [comments, setComments] = useState<string>("");
  const commentsRef = useRef<HTMLTextAreaElement>(null);

  // Set cursor to typing point when the popover opens.
  useEffect(() => {
    if (isOpen && commentsRef.current) {
      commentsRef.current.focus();
      commentsRef.current.setSelectionRange(comments.length, comments.length);
    }
  }, [isOpen]);

  function saveAndClose() {
    onFlagSet?.(comments.trim() === "" ? null : comments);
    setComments("");
    setIsOpen(false);
  }

  function unsetAndClose() {
    onFlagUnset?.();
    setComments("");
    setIsOpen(false);
  }

  const handleOpenClose = (open: boolean) => {
    if (!note.isFlagged) {
      onFlagSet?.(null);
    }

    if (open) {
      setComments(note.qaComments ?? "");
    }

    setIsOpen(open);
  };

  const handleKeyDown: KeyboardEventHandler<HTMLDivElement> = (ev) => {
    if (ev.key === "Enter") {
      saveAndClose();
    }
  };

  return (
    <Popover
      className={clsx("inline-flex flex-col items-center subpixel-antialiased")}
      classNames={{ content: "p-1" }}
      isOpen={isOpen}
      onClose={saveAndClose}
      onKeyDown={handleKeyDown}
      onOpenChange={handleOpenClose}
    >
      <PopoverTrigger>{children}</PopoverTrigger>
      <PopoverContent aria-label="Set QA flag details">
        <div className="w-fit max-w-[325px] flex flex-col justify-center gap-1 p-1">
          <p className="text-sm text-zinc-500 max-w-[95%] mx-auto mt-1">
            Flagged notes are reviewed by the team for quality improvement.
          </p>
          <Divider className="mt-2 mb-1" />
          <div className="w-full flex justify-start h-fit m-0 px-2 py-1.5">
            <Textarea
              ref={commentsRef}
              className=""
              label="Comments (Optional)"
              labelPlacement="outside"
              maxRows={10}
              minRows={3}
              placeholder="Enter any extra detail here"
              value={comments}
              onValueChange={(text) => setComments(text.slice(0, 500))}
            />
          </div>
          <Divider className="mt-2 mb-1" />
          <div className="flex flex-row gap-2 justify-end">
            <Button radius="sm" size="sm" onClick={unsetAndClose}>
              Clear Flag
            </Button>
            <Button
              color="primary"
              radius="sm"
              size="sm"
              onClick={saveAndClose}
            >
              Save
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
