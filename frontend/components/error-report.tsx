import { Button } from "@nextui-org/button";
import { Card, CardBody, CardHeader } from "@nextui-org/card";
import { Divider } from "@nextui-org/divider";

import { DataError } from "@/data-models";

type ErrorReportProps = {
  errorInfo: DataError;
  retryAction?: () => void;
};

export const ErrorReport = (props: ErrorReportProps) => {
  // const copyErrorDetails = async () => {
  //   if (props.errorInfo.details) {
  //     await navigator.clipboard.writeText(props.errorInfo.details);
  //   }
  // };

  return (
    <Card radius="sm" shadow="sm">
      <CardHeader className="flex flex-row gap-4 justify-between items-center">
        <p className="text-lg font-semibold text-red-500">
          {props.errorInfo.detail.name}
        </p>
        {/* {props.errorInfo.details && (
          <Button color="default" size="sm" onClick={copyErrorDetails}>
            Copy Error Details
          </Button>
        )} */}
        {props.retryAction && (
          <Button color="default" size="sm" onClick={props.retryAction}>
            Retry
          </Button>
        )}
      </CardHeader>
      <Divider />
      <CardBody>
        {/* <p className="text-left max-w-2xl">{props.errorInfo.message}</p> */}
        {props.errorInfo.detail.message && (
          <p className="text-sm text-left max-w-2xl font-mono whitespace-pre-wrap">
            {props.errorInfo.detail.message}
          </p>
        )}
      </CardBody>
    </Card>
  );
};
