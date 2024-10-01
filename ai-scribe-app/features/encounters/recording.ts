export type Recording = {
  filename: string;
  mediaType: string;
  duration?: number;
  transcript?: string;
  transcriptionService?: string;
  timeToTranscribe?: number;
  audio?: string | File;
};
