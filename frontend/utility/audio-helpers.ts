export function formatDuration(seconds: number) {
  return [
    Math.floor((seconds % 3600) / 60), // minutes
    Math.floor(seconds % 60), // seconds
  ]
    .map((v) => (v < 10 ? `0${v}` : v))
    .join(":");
}
