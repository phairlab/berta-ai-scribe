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

export function formatDatestring(date: Date) {
  date = new Date(date);
  const formattedDate = `${date.getFullYear()}-${("0" + date.getDate()).slice(-2)}-${("0" + (date.getMonth() + 1)).slice(-2)}`;
  const formattedTime = `${("0" + date.getHours()).slice(-2)}:${("0" + date.getMinutes()).slice(-2)}`;

  return `${formattedDate} ${formattedTime}`;
}
