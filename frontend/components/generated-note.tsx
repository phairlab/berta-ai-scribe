import { Button } from "@nextui-org/button";
import { Card, CardBody, CardHeader } from "@nextui-org/card";
import { Divider } from "@nextui-org/divider";

type GeneratedNoteProps = {
  type: string;
  text: string;
};

export const GeneratedNote = (props: GeneratedNoteProps) => {
  const copyNote = async () => {
    if (props.text) {
      await navigator.clipboard.writeText(props.text);
    }
  };

  return (
    <Card radius="sm" shadow="sm">
      <CardHeader className="flex flex-row gap-4 justify-between items-center">
        <p className="text-lg font-semibold">{props.type}</p>
        <Button color="default" size="sm" onClick={copyNote}>
          Copy
        </Button>
      </CardHeader>
      <Divider />
      <CardBody>
        <p className="text-left max-w-2xl whitespace-pre-wrap">{props.text}</p>
      </CardBody>
    </Card>
  );
};
