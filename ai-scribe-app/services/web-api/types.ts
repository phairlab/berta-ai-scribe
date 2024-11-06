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
};

export type NoteGeneratorOutput = {
  text: string;
  noteId: string;
};

export type Recording = {
  id: string;
  mediaType?: string;
  fileSize?: number;
  duration?: number;
  waveformPeaks?: number[];
  transcript?: string;
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
