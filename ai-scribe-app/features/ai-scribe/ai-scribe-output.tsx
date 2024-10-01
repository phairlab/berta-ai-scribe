import { Button } from "@nextui-org/button";
import { Card, CardBody, CardHeader } from "@nextui-org/card";
import { Divider } from "@nextui-org/divider";

type AIScribeOutputProps = {
  title: string;
  text: string;
};

export const AIScribeOutput = ({ title, text }: AIScribeOutputProps) => {
  const copyNote = async () => {
    if (text) {
      await navigator.clipboard.writeText(text);
    }
  };

  return (
    <Card radius="sm" shadow="sm">
      <CardHeader className="flex flex-row gap-4 justify-between items-center">
        <p className="text-lg font-semibold">{title}</p>
        <Button color="default" size="sm" onClick={copyNote}>
          Copy
        </Button>
      </CardHeader>
      <Divider />
      <CardBody>
        <p className="text-left max-w-2xl whitespace-pre-wrap">{text}</p>
      </CardBody>
    </Card>
  );
};
