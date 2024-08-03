export type DataError = {
  detail: {
    name: string;
    message: string;
    shouldRetry: boolean;
  };
};

export function isDataError(entity: any): entity is DataError {
  return (
    "detail" in entity &&
    "name" in entity.detail &&
    "shouldRetry" in entity.detail &&
    "message" in entity.detail
  );
}
