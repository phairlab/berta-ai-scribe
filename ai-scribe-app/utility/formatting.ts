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
  // Format: YYYY-MM-DD
  const formattedDate = `${date.getFullYear()}-${("0" + (date.getMonth() + 1)).slice(-2)}-${("0" + date.getDate()).slice(-2)}`;

  return formattedDate;
}

export function formatTime(date: Date) {
  // Format: HH:MM
  const formattedTime = `${("0" + date.getHours()).slice(-2)}:${("0" + date.getMinutes()).slice(-2)}`;

  return formattedTime;
}

export function formatDatetime(date: Date) {
  return `${formatDate(date)} ${formatTime(date)}`;
}

export function formatDateWithWeekday(date: Date) {
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  console.log(date.getDay(), weekday[date.getDay()]);

  return `${formatDate(date)} (${weekday[date.getDay()]})`;
}
