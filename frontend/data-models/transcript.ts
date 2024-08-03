export type Transcript = {
  text: string;
  timeToProcessAudio: number;
  timeToGenerate: number;
  serviceUsed: string;
  modelUsed: string;
};

export function isTranscript(entity: any): entity is Transcript {
  return (
    "text" in entity &&
    "timeToProcessAudio" in entity &&
    "timeToGenerate" in entity &&
    "serviceUsed" in entity &&
    "modelUsed" in entity
  );
}
