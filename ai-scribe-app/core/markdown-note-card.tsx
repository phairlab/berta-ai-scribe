/* eslint-disable @typescript-eslint/no-unused-vars */
import { useMemo, useRef, useState } from "react";

import Markdown from "react-markdown";

import { Button } from "@nextui-org/button";
import { Divider } from "@nextui-org/divider";
import { SelectItem } from "@nextui-org/select";

import * as convert from "@/utility/converters";

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
  showTitle?: boolean;
  showRawOutput?: boolean;
};

export const MarkdownNoteCard = ({
  note,
  showTitle = true,
  showRawOutput = false,
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
    () => convert.fromMarkdownToPlainText(note.content),
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
    <>
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
    </>
  );

  return (
    <OutputCard controls={controls} title={showTitle && note.title}>
      {displayFormat === "Plain Text" ? (
        plainText
      ) : displayFormat === "Markdown" ? (
        <div className="font-mono text-sm">{markdown}</div>
      ) : (
        <div ref={markdownNode}>
          <Markdown
            className="flex flex-col gap-1 leading-normal p-0"
            components={{
              h1({ node, ...rest }) {
                return (
                  // eslint-disable-next-line jsx-a11y/heading-has-content
                  <h1
                    className="font-semibold mt-4 first:mt-0 [&+*]:mt-0"
                    {...rest}
                  />
                );
              },
              h2({ node, ...rest }) {
                return (
                  // eslint-disable-next-line jsx-a11y/heading-has-content
                  <h2 className="italic mt-4 first:mt-0 [&+*]:mt-0" {...rest} />
                );
              },
              p({ node, ...rest }) {
                return (
                  <p
                    className="mt-4 first:mt-0 [&+ul]:mt-0 [&+ol]:mt-0"
                    {...rest}
                  />
                );
              },
              blockquote({ node, ...rest }) {
                return (
                  <blockquote
                    className="[&>p]:my-0 py-1 ms-4 ps-3 border-s-1 flex flex-col gap-4"
                    {...rest}
                  />
                );
              },
              pre({ node, ...rest }) {
                return <pre className="text-sm" {...rest} />;
              },
              ul({ node, ...rest }) {
                return (
                  <ul
                    className="list-['-_'] list-outside flex flex-col ps-3 mt-4 first:mt-0"
                    {...rest}
                  />
                );
              },
              ol({ node, ...rest }) {
                return (
                  <ul
                    className="list-decimal list-outside flex flex-col ps-6 mt-4 first:mt-0"
                    {...rest}
                  />
                );
              },
              hr() {
                return <Divider className="mx-auto w-[98%]" />;
              },
              a({ node, href, title, children, ...rest }) {
                return (
                  <span {...rest}>
                    {children && children !== href
                      ? `[${children}](${href}${title ? ` "${title}"` : ""})`
                      : `<${href}>`}
                  </span>
                );
              },
              img({ node, src, title, alt, ...rest }) {
                return (
                  <span {...rest}>
                    {`![${alt}](${src}${title ? ` "${title}"` : ""})`}
                  </span>
                );
              },
            }}
            skipHtml={true}
          >
            {markdown}
          </Markdown>
        </div>
      )}
    </OutputCard>
  );
};
