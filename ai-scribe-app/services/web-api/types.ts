export type NoteOutputType = "Plain Text" | "Markdown";

export type ChangedEntities<T> = {
  created: T[];
  modified: T[];
  removed: T[];
};

export type DataChanges = {
  lastUpdate: Date;
  userInfo: UserInfo | null;
  noteDefinitions: ChangedEntities<NoteDefinition>;
  encounters: ChangedEntities<Encounter>;
};

export type DataPage<T> = {
  data: T[];
  isLastPage: boolean;
};

export type DraftNote = {
  id: string;
  definitionId: string;
  created: Date;
  title: string;
  content: string;
  outputType: NoteOutputType;
};

export type Encounter = {
  id: string;
  created: Date;
  modified: Date;
  label?: string;
  summary?: string;
  recording?: Recording;
  draftNotes: DraftNote[];
};

export type NoteDefinition = {
  id: string;
  modified: Date;
  title: string;
  instructions: string;
  isBuiltin: boolean;
  isSystemDefault: boolean;
  outputType: NoteOutputType;
};

export type NoteGeneratorOutput = {
  text: string;
  noteId: string;
};

export type Recording = {
  id: string;
  mediaType: string | null;
  fileSize: number | null;
  duration: number | null;
  waveformPeaks: number[] | null;
  transcript: string | null;
};

export type SampleRecording = {
  filename: string;
  transcript: string;
};

export type TextResponse = {
  text: string;
};

export type TranscriberOutput = {
  text: string;
};

export type UserInfo = {
  username: string;
  updated: Date;
  defaultNoteType?: string;
};
