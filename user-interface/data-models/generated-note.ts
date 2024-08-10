export type GeneratedNote = {
  text: string;
  noteType: string;
  timeToGenerate: number;
  serviceUsed: string;
  modelUsed: string;
};

export function isGeneratedNote(entity: any): entity is GeneratedNote {
  return (
    "text" in entity &&
    "noteType" in entity &&
    "timeToGenerate" in entity &&
    "serviceUsed" in entity &&
    "modelUsed" in entity
  );
}
