import { Button } from "@nextui-org/button";
import { Code } from "@nextui-org/code";

import { ApplicationError } from "@/utility/errors";

import { OutputCard } from "./output-card";

const whisperOfflineMessage = (
  <div className="flex flex-col">
    <p>
      The transcription service is currently offline. To restart the serivice,
      run the following commands in Snowflake, using the RL_TEAM_JENKINS role:
    </p>
    <Code>USE DATABASE DB_TEAM_JENKINS;</Code>
    <Code>USE SCHEMA JENKINS_PROD;</Code>
    <Code>ALTER SERVICE whisper_service RESUME;</Code>
    <p>
      The service can take a few minutes to restart. To view the current status,
      execute the following command:
    </p>
    <Code>DESCRIBE SERVICE whisper_service;</Code>
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
