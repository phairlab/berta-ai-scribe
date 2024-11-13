/* eslint-disable @typescript-eslint/no-unused-vars */
import { useEffect, useRef, useState } from "react";

import Markdown from "react-markdown";

import { Button } from "@nextui-org/button";
import { SelectItem } from "@nextui-org/select";

import * as convert from "@/utility/converters";

import { OutputCard } from "./output-card";
import { SafeSelect } from "./safe-select";
import { DraftNote } from "./types";

type DisplayFormat = "Rich Text" | "Markdown" | "Plain Text";

// This can be removed after upgrading Next.js and Typescript.
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
  showTitle?: boolean;
};

export const MarkdownNoteCard = ({
  note,
  showTitle = true,
}: MarkdownNoteCardProps) => {
  const markdownNodeRef = useRef<HTMLDivElement | null>(null);
  const [markdown, setMarkdown] = useState<string | null>(null);
  const [plainText, setPlainText] = useState<string | null>(null);
  const [displayFormat, setDisplayFormat] =
    useState<DisplayFormat>("Rich Text");

  const convertToPlainText = (markdown: string) => {
    let plainText = convert.toPlainTextFromMarkdown(markdown);

    return plainText;
  };

  useEffect(() => {
    if (note) {
      const markdown = note.content;
      const plainText = convertToPlainText(markdown);

      setMarkdown(markdown);
      setPlainText(plainText);
    } else {
      setMarkdown(null);
      setPlainText(null);
    }
  }, [note]);

  const copyNote = async () => {
    if (displayFormat === "Rich Text" && markdownNodeRef.current !== null) {
      try {
        const htmlFragment = markdownNodeRef.current.innerHTML;

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
        // Fallback to copying plain text.
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
    <>
      <SafeSelect
        aria-label="Display Format Selector"
        className="w-32"
        disallowEmptySelection={true}
        selectedKeys={[displayFormat]}
        selectionMode="single"
        size="sm"
        onChange={(e) => setDisplayFormat(e.target.value as DisplayFormat)}
      >
        <SelectItem key="Rich Text">Formatted</SelectItem>
        <SelectItem key="Plain Text">Plain Text</SelectItem>
        <SelectItem key="Markdown">Markdown</SelectItem>
      </SafeSelect>
      <Button color="default" size="sm" onClick={copyNote}>
        Copy
      </Button>
    </>
  );

  return (
    <OutputCard controls={controls} title={showTitle && note.title}>
      {displayFormat === "Plain Text" ? (
        plainText
      ) : displayFormat === "Markdown" ? (
        markdown
      ) : (
        <div ref={markdownNodeRef}>
          <Markdown
            className="flex flex-col gap-1 leading-normal p-0"
            components={{
              h1({ node, ...rest }) {
                return (
                  // eslint-disable-next-line jsx-a11y/heading-has-content
                  <h1 className="font-semibold mt-3 first:mt-0" {...rest} />
                );
              },
              h2({ node, ...rest }) {
                return (
                  // eslint-disable-next-line jsx-a11y/heading-has-content
                  <h2 className="italic" {...rest} />
                );
              },
              ul({ node, ...rest }) {
                return (
                  <ul
                    className="list-['-_'] list-outside flex flex-col ms-3"
                    {...rest}
                  />
                );
              },
              ol({ node, ...rest }) {
                return (
                  <ul
                    className="list-decimal list-outside flex flex-col ms-6"
                    {...rest}
                  />
                );
              },
            }}
          >
            {markdown}
          </Markdown>
        </div>
      )}
    </OutputCard>
  );
};
