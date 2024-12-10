export type NoteOutputType = "Plain Text" | "Markdown";

export type ExternalChanges<T> = {
  created: T[];
  modified: T[];
  removed: T[];
};

export type ExternalChangeUpdate = {
  lastUpdate: string;
  userInfo: UserInfo | null;
  noteDefinitions: ExternalChanges<NoteDefinition>;
  encounters: ExternalChanges<Encounter>;
};

export type Page<T> = {
  data: T[];
  isLastPage: boolean;
};

export type DraftNote = {
  id: string;
  definitionId: string;
  created: string;
  title: string;
  content: string;
  outputType: NoteOutputType;
  isFlagged: boolean;
  qaComments: string | null;
};

export type Encounter = {
  id: string;
  created: string;
  modified: string;
  label: string | null;
  autolabel: string | null;
  recording?: Recording;
  draftNotes: DraftNote[];
};

export type NoteDefinition = {
  id: string;
  modified: string;
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
  updated: string;
  defaultNoteType?: string;
};
