import { Button } from "@nextui-org/button";
import { Card, CardBody, CardHeader } from "@nextui-org/card";
import { Divider } from "@nextui-org/divider";

import { ApplicationError } from "@/utility/errors";

type ErrorReportProps = {
  errorInfo: ApplicationError;
  retryAction?: () => void;
};

export const ErrorReport = (props: ErrorReportProps) => {
  return (
    <Card radius="sm" shadow="sm">
      <CardHeader className="flex flex-row gap-4 justify-between items-center">
        <p className="text-lg font-semibold text-red-500">
          {props.errorInfo.name}
        </p>
        {props.retryAction && (
          <Button color="default" size="sm" onClick={props.retryAction}>
            Retry
          </Button>
        )}
      </CardHeader>
      <Divider />
      <CardBody>
        {props.errorInfo.message && (
          <p className="text-sm text-left max-w-2xl font-mono whitespace-pre-wrap">
            {props.errorInfo.message}
          </p>
        )}
      </CardBody>
    </Card>
  );
};
