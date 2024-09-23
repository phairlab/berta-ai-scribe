export type NoteDefinition = {
  uuid: string;
  createdAt: Date;
  title: string;
  instructions: string;
  isBuiltin: boolean;
  isDefault: boolean;
  isDiscarded: boolean;
  isUnsaved?: boolean;
  isNew?: boolean;
};
