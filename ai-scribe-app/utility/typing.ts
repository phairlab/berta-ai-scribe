export type OptionalFields<T, K extends keyof T> = Pick<Partial<T>, K> &
  Omit<T, K>;

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;
