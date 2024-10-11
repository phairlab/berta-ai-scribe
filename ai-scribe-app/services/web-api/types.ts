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
};

export type Encounter = {
  uuid: string;
  createdAt: Date;
  title?: string;
  recording: Recording;
  draftNotes: DraftNote[];
};

export type NoteDefinition = {
  uuid: string;
  createdAt: Date;
  title: string;
  instructions: string;
  isBuiltin: boolean;
  isDefault: boolean;
  isDiscarded: boolean;
};

export type NoteGeneratorOutput = {
  text: string;
  tag: string;
};

export type Recording = {
  filename: string;
  mediaType: string;
  duration?: number;
  transcript?: string;
  transcriptionService?: string;
  timeToTranscribe?: number;
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
