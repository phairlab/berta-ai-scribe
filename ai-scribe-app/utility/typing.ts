export type OptionalFields<T, K extends keyof T> = Omit<T, K> &
  Pick<Partial<T>, K>;

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;
