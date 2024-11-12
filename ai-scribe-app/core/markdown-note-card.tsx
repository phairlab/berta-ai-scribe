/* eslint-disable @typescript-eslint/no-unused-vars */
import { useEffect, useRef, useState } from "react";

import { marked } from "marked";
import Markdown from "react-markdown";

import { Button } from "@nextui-org/button";
import { SelectItem } from "@nextui-org/select";

import { OutputCard } from "./output-card";
import { SafeSelect } from "./safe-select";
import { DraftNote } from "./types";

function plainTextRenderer() {
  const render = new marked.Renderer();

  render.link = ({ href, title, tokens }) => href;
  render.paragraph = ({ tokens }) => tokens.map((t) => t.raw).join() + "\n";
  render.heading = ({ tokens, depth }) =>
    "\n" + tokens.map((t) => t.raw).join() + "\n";
  render.list = (token) =>
    token.items
      .map(
        (item, index) =>
          (token.ordered ? ` ${index + 1}. ` : " - ") + item.text,
      )
      .join("\n") + "\n";

  return render;
}

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

  const canCopyPlainText = plainText !== null;
  const canCopyMarkdown = markdown !== null;
  const canCopyRichText =
    plainText !== null &&
    markdown !== null &&
    (ClipboardItem.supports("text/html") ||
      ClipboardItem.supports("text/markdown"));

  const canCopy =
    (displayFormat === "Rich Text" && canCopyRichText) ||
    (displayFormat === "Markdown" && canCopyMarkdown) ||
    (displayFormat === "Plain Text" && canCopyPlainText);

  function markdownToPlainText(markdown: string) {
    const plainText = marked(markdown, {
      renderer: plainTextRenderer(),
    }) as string;

    return plainText
      .trim()
      .replace(/\\\*/g, "*")
      .replace(/\n?<</gm, "\n\n<<")
      .replace(/\n\n\n/g, "\n\n");
  }

  useEffect(() => {
    if (note) {
      const markdown = note.content;
      const plainText = markdownToPlainText(markdown);

      setMarkdown(markdown);
      setPlainText(plainText);
    } else {
      setMarkdown(null);
      setPlainText(null);
    }
  }, [note]);

  const copyNote = async () => {
    if (displayFormat === "Rich Text" && canCopyRichText) {
      // Include HTML data if supported.
      const htmlData = markdownNodeRef.current &&
        ClipboardItem.supports("text/html") && {
          "text/html": markdownNodeRef.current.innerHTML,
        };

      // Include Markdown data if supported.
      const markdownData = markdown &&
        ClipboardItem.supports("text/markdown") && {
          "text/markdown": markdown,
        };

      // Include plain text data.
      const plainTextData = plainText && {
        "text/plain": plainText,
      };

      const data = new ClipboardItem({
        ...htmlData,
        ...markdownData,
        ...plainTextData,
      });

      await navigator.clipboard.write([data]);
    } else if (displayFormat === "Markdown" && canCopyMarkdown) {
      await navigator.clipboard.writeText(markdown);
    } else if (displayFormat === "Plain Text" && canCopyPlainText) {
      await navigator.clipboard.writeText(plainText);
    }
  };

  const controls = (
    <>
      <SafeSelect
        aria-label="Display Format Selector"
        className="w-32"
        selectedKeys={[displayFormat]}
        selectionMode="single"
        size="sm"
        onChange={(e) => setDisplayFormat(e.target.value as DisplayFormat)}
      >
        <SelectItem key="Rich Text">Formatted</SelectItem>
        <SelectItem key="Plain Text">Plain Text</SelectItem>
        <SelectItem key="Markdown">Markdown</SelectItem>
      </SafeSelect>
      <Button
        color="default"
        isDisabled={!canCopy}
        size="sm"
        onClick={copyNote}
      >
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
