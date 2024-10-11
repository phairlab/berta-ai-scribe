type SortDirection = "Ascending" | "Descending";

export function alphabetically<T>(
  field: (x: T) => string,
  direction: SortDirection = "Ascending",
) {
  return (a: T, b: T): number =>
    (direction === "Descending" ? -1 : 1) *
    (field(a) < field(b) ? -1 : field(a) > field(b) ? 1 : 0);
}

export function byDate<T>(
  field: (x: T) => Date,
  direction: SortDirection = "Ascending",
) {
  return (a: T, b: T): number =>
    (direction === "Descending" ? -1 : 1) *
    (new Date(field(a)).getTime() - new Date(field(b)).getTime());
}
