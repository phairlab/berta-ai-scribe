import { Button } from "@nextui-org/button";

import { ApplicationError } from "@/utility/errors";

import { OutputCard } from "./output-card";

const whisperOfflineMessage = (
  <div className="flex flex-col">
    <p>The transcription service is currently offline.</p>
  </div>
);

type ErrorCardProps = {
  error: ApplicationError;
  canDismiss?: boolean | undefined;
  retryAction?: (() => void) | null;
  onDismiss?: () => void;
};

export const ErrorCard = ({
  error,
  canDismiss = false,
  retryAction,
  onDismiss,
}: ErrorCardProps) => {
  const isWhisperOfflineError = error.message.startsWith(
    "Cannot connect to host whisper-service",
  );

  const title = (
    <span className="text-red-500">
      {isWhisperOfflineError ? "Transcription Service Offline" : error.name}
    </span>
  );
  const controls = (
    <>
      {retryAction && (
        <Button color="default" size="sm" onClick={retryAction}>
          Retry
        </Button>
      )}
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
        <div className="flex flex-col gap-3 text-sm font-mono">
          {error.errorId && (
            <div>
              <span>Error ID: </span>
              {error.errorId}
            </div>
          )}
          <div>
            {isWhisperOfflineError ? whisperOfflineMessage : error.message}
          </div>
        </div>
      )}
    </OutputCard>
  );
};
