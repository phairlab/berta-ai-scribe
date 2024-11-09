/* eslint-disable @typescript-eslint/no-unused-vars */
import Markdown from "react-markdown";

import { Button } from "@nextui-org/button";

import { OutputCard } from "./output-card";
import { DraftNote } from "./types";

type NoteCardProps = {
  note: DraftNote;
  showTitle?: boolean;
};

export const NoteCard = ({ note, showTitle = true }: NoteCardProps) => {
  const copyNote = async () => {
    if (note.content) {
      await navigator.clipboard.writeText(note.content);
    }
  };

  const controls = (
    <Button color="default" size="sm" onClick={copyNote}>
      Copy
    </Button>
  );

  return (
    <OutputCard controls={controls} title={showTitle && note.title}>
      <Markdown
        className="flex flex-col gap-3 leading-normal m-0 p-0"
        components={{
          ul({ node, ...rest }) {
            return (
              <ul
                className="list-['-_'] list-outside text-red-500 flex flex-col gap-1 ms-3"
                {...rest}
              />
            );
          },
          // li({ node, ...rest }) {
          //   return <li className="leading-normal" {...rest} />;
          // },
        }}
      >
        {note.content}
      </Markdown>
    </OutputCard>
  );
};
