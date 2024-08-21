export type GeneratedNote = {
  text: string;
  title: string;
};

export function isGeneratedNote(entity: any): entity is GeneratedNote {
  return "text" in entity && "title" in entity;
}
