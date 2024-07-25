export type Transcript = {
  text: string;
  serviceUsed: string;
  timeToGenerate: number;
};

export type GeneratedNote = {
  text: string;
  noteType: string;
  serviceUsed: string;
  modelUsed: string;
  timeToGenerate: number;
};

export type AudioSample = {
  name: string;
  path: string;
};
