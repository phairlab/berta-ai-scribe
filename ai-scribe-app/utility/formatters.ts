export function formatDuration(duration: number | null | undefined) {
  if (!duration) {
    return "--:--";
  }

  const seconds = Math.trunc(duration);

  return [
    Math.trunc((seconds % 3600) / 60), // minutes
    Math.trunc(seconds % 60), // seconds
  ]
    .map((v) => (isNaN(v) ? "??" : v < 10 ? `0${v}` : v))
    .join(":");
}

export function formatDisplayName(username: string) {
  // Remove the email address part of a username.
  return username.split("@")[0];
}

export function formatDate(date: Date) {
  const formattedDate = `${date.getFullYear()}-${("0" + date.getMonth()).slice(-2)}-${("0" + (date.getDate() + 1)).slice(-2)}`;

  return formattedDate;
}

export function formatDatetime(date: Date) {
  const formattedTime = `${("0" + date.getHours()).slice(-2)}:${("0" + date.getMinutes()).slice(-2)}`;

  return `${formatDate(date)} ${formattedTime}`;
}
