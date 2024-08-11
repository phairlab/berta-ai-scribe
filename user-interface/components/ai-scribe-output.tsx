import { Button } from "@nextui-org/button";
import { Card, CardBody, CardHeader } from "@nextui-org/card";
import { Divider } from "@nextui-org/divider";

import * as Models from "@/data-models";

export const AIScribeOutput = ({ note }: { note: Models.GeneratedNote }) => {
  const copyNote = async () => {
    if (note.text) {
      await navigator.clipboard.writeText(note.text);
    }
  };

  return (
    <Card radius="sm" shadow="sm">
      <CardHeader className="flex flex-row gap-4 justify-between items-center">
        <p className="text-lg font-semibold">{note.noteType}</p>
        <Button color="default" size="sm" onClick={copyNote}>
          Copy
        </Button>
      </CardHeader>
      <Divider />
      <CardBody>
        <p className="text-left max-w-2xl whitespace-pre-wrap">{note.text}</p>
      </CardBody>
    </Card>
  );
};
