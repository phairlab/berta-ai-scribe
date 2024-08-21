export type Transcript = {
  text: string;
};

export function isTranscript(entity: any): entity is Transcript {
  return "text" in entity;
}
