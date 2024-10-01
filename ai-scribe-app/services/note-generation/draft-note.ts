export type DraftNote = {
  uuid?: string;
  noteDefinitionUuid: string;
  createdAt: Date;
  tag: string;
  title: string;
  text: string;
  generationService: string;
  model: string;
  timeToGenerate: number;
  isDiscarded: boolean;
  isUnsaved?: boolean;
};
