import { useMemo, useRef, useState } from "react";

import { Button } from "@nextui-org/button";
import { SelectItem } from "@nextui-org/select";

import { convertMarkdown } from "@/utility/conversion";

import { NoteQAFlag } from "@/features/user-feedback/note-qa-flag";

import { Markdown } from "./markdown";
import { MobileCompatibleSelect } from "./mobile-compatible-select";
import { OutputCard } from "./output-card";
import { DraftNote } from "./types";

type DisplayFormat = "Rich Text" | "Markdown" | "Plain Text";

// This patch declaration can potentially be removed after
// upgrading Next.js and Typescript.
declare var ClipboardItem: {
  new (
    items: Record<string, string | Blob | PromiseLike<string | Blob>>,
    options?: ClipboardItemOptions,
  ): ClipboardItem;
  prototype: ClipboardItem;
  supports(type: string): boolean;
};

type MarkdownNoteCardProps = {
  note: DraftNote;
  showRawOutput?: boolean;
  canFlag?: boolean;
  onFlagSet?: (comments: string | null) => void;
  onFlagUnset?: () => void;
};

export const MarkdownNoteCard = ({
  note,
  showRawOutput = false,
  canFlag = true,
  onFlagSet,
  onFlagUnset,
}: MarkdownNoteCardProps) => {
  const markdownNode = useRef<HTMLDivElement | null>(null);
  const [displayFormat, setDisplayFormat] =
    useState<DisplayFormat>("Rich Text");

  let outputTypes = [
    { key: "Rich Text", label: "Formatted" },
    { key: "Plain Text", label: "Plain Text" },
  ];

  if (showRawOutput) {
    outputTypes = [...outputTypes, { key: "Markdown", label: "Markdown" }];
  }

  const markdown = note.content;
  const plainText = useMemo(
    () => convertMarkdown.toPlainText(note.content),
    [note],
  );

  const copyNote = async () => {
    if (displayFormat === "Rich Text" && markdownNode.current !== null) {
      try {
        const htmlFragment = markdownNode.current.innerHTML;

        // Include HTML data if supported.
        const htmlData = ClipboardItem?.supports("text/html")
          ? {
              "text/html": new Blob([htmlFragment], {
                type: "text/html",
              }),
            }
          : undefined;

        // Include Markdown data if supported.
        const markdownData =
          ClipboardItem?.supports("text/markdown") && markdown
            ? {
                "text/markdown": new Blob([markdown], {
                  type: "text/markdown",
                }),
              }
            : undefined;

        // Include plain text data.
        const plainTextData = plainText
          ? {
              "text/plain": new Blob([plainText], { type: "text/plain" }),
            }
          : undefined;

        const data = new ClipboardItem({
          ...htmlData,
          ...markdownData,
          ...plainTextData,
        });

        await navigator.clipboard.write([data]);
      } catch {
        // Fallback to copying the plain text only.
        if (plainText !== null) {
          await navigator.clipboard.writeText(plainText);
        }
      }
    } else if (displayFormat === "Markdown" && markdown !== null) {
      await navigator.clipboard.writeText(markdown);
    } else if (plainText !== null) {
      await navigator.clipboard.writeText(plainText);
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
        <div className="flex flex-row items-center gap-2">
          <MobileCompatibleSelect
            aria-label="Display Format Selector"
            className="w-32"
            disallowEmptySelection={true}
            items={outputTypes}
            selectedKeys={[displayFormat]}
            selectionMode="single"
            size="sm"
            onChange={(e) => setDisplayFormat(e.target.value as DisplayFormat)}
          >
            {(item) => <SelectItem key={item.key}>{item.label}</SelectItem>}
          </MobileCompatibleSelect>
          <Button color="default" size="sm" onClick={copyNote}>
            Copy
          </Button>
        </div>
      </div>
      {note.qaComments && (
        <div className="text-xs text-zinc-500 px-6 line-clamp-2 text-ellipsis" title={note.qaComments}>{note.qaComments}</div>
      )}
    </div>
  );

  return (
    <OutputCard controls={controls}>
      {displayFormat === "Plain Text" ? (
        plainText
      ) : displayFormat === "Markdown" ? (
        <div className="font-mono text-sm">{markdown}</div>
      ) : (
        <div ref={markdownNode}>
          <Markdown>{markdown}</Markdown>
        </div>
      )}
    </OutputCard>
  );
};
