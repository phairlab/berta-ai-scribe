import { Button } from "@nextui-org/button";

import { ApplicationError } from "@/utility/errors";

import { OutputCard } from "./output-card";

type ErrorCardProps = {
  error: ApplicationError;
  canDismiss?: boolean | undefined;
  retryAction?: () => void;
  onDismiss?: () => void;
};

export const ErrorCard = ({
  error,
  canDismiss = false,
  retryAction,
  onDismiss,
}: ErrorCardProps) => {
  const title = <span className="text-red-500">{error.name}</span>;
  const controls = retryAction && (
    <>
      <Button color="default" size="sm" onClick={retryAction}>
        Retry
      </Button>
      {canDismiss && (
        <Button color="default" size="sm" onClick={onDismiss}>
          Dismiss
        </Button>
      )}
    </>
  );

  return (
    <OutputCard controls={controls} title={title}>
      {error.message && (
        <div className="text-sm font-mono">{error.message}</div>
      )}
    </OutputCard>
  );
};
