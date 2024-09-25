import { DraftNote, Encounter, NoteDefinition, UserSession } from "@/models";

export function formatDuration(duration: number) {
  const seconds = Math.trunc(duration);

  return [
    Math.trunc((seconds % 3600) / 60), // minutes
    Math.trunc(seconds % 60), // seconds
  ]
    .map((v) => (v < 10 ? `0${v}` : v))
    .join(":");
}

export function userDisplayName(user: UserSession) {
  return user.username.split("@")[0];
}

export function formatDatestring(date: Date) {
  date = new Date(date);
  const formattedDate = `${date.getFullYear()}-${("0" + date.getDate()).slice(-2)}-${("0" + (date.getMonth() + 1)).slice(-2)}`;
  const formattedTime = `${("0" + date.getHours()).slice(-2)}:${("0" + date.getMinutes()).slice(-2)}`;

  return `${formattedDate} ${formattedTime}`;
}

export function sortEncountersByDate(a: Encounter, b: Encounter): number {
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

export function sortNotesByDate(a: DraftNote, b: DraftNote): number {
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

export function sortDefinitionsByTitle(
  a: NoteDefinition,
  b: NoteDefinition,
): number {
  if (a.title > b.title) {
    return -1;
  } else if (a.title === b.title) {
    return 0;
  } else {
    return 1;
  }
}

// For cases when these colors need to be used in code instead of css classes.
// https://tailwindcss.com/docs/customizing-colors
export const tailwindColors = {
  "zinc-400": "#a1a1aa",
  "zinc-500": "#71717a",
  "zinc-600": "#52525b",

  "red-200": "#fecaca",
  "red-300": "#fca5a5",
  "red-400": "#f87171",
  "red-600": "#dc2626",

  "amber-400": "#fbbf24",
  "amber-500": "#f59e0b",

  "blue-400": "#60a5fa",

  "rose-400": "#fb7185",
};
