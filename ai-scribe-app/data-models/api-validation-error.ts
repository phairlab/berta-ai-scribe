type ValidationDetail = {
  type: string;
  loc: [string, string | number];
  msg: string;
  input?: any;
};

export type ValidationError = {
  detail: ValidationDetail[];
};

function isValidationDetail(entity: any): entity is ValidationDetail {
  return "type" in entity && "loc" in entity && "msg" in entity;
}

export function isValidationError(entity: any): entity is ValidationError {
  return (
    "detail" in entity &&
    entity.detail instanceof Array &&
    (entity.detail as Array<any>).every((i) => isValidationDetail(i))
  );
}
