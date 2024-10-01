import { Button } from "@nextui-org/button";
import { Card, CardBody, CardHeader } from "@nextui-org/card";
import { Divider } from "@nextui-org/divider";

import { ApplicationError } from "@/utility/errors";

type ErrorCardProps = {
  errorInfo: ApplicationError;
  retryAction?: () => void;
};

export const ErrorCard = ({ errorInfo, retryAction }: ErrorCardProps) => (
  <Card radius="sm" shadow="sm">
    <CardHeader className="flex flex-row gap-4 justify-between items-center">
      <p className="text-lg font-semibold text-red-500">{errorInfo.name}</p>
      {retryAction && (
        <Button color="default" size="sm" onClick={retryAction}>
          Retry
        </Button>
      )}
    </CardHeader>
    <Divider />
    <CardBody>
      {errorInfo.message && (
        <p className="text-sm text-left max-w-2xl font-mono whitespace-pre-wrap">
          {errorInfo.message}
        </p>
      )}
    </CardBody>
  </Card>
);
