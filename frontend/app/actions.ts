"use server";

type TranscriptData = {
  generationTime: number;
  method: string;
  text: string;
};

export const transcribeAudio = async (
  formData: FormData,
): Promise<TranscriptData> => {
  const response = await fetch(
    `${process.env.APP_API_URL}/transcripts/create`,
    {
      method: "POST",
      body: formData,
    },
  );

  return response.json();
};

type GeneratedNoteData = {
  generationTime: number;
  model: string;
  text: string;
};

export const generateNote = async (
  transcript: string,
  summaryType: string,
): Promise<GeneratedNoteData> => {
  const response = await fetch(`${process.env.APP_API_URL}/summaries/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      transcript: transcript,
      summaryType: summaryType,
    }),
  });

  return response.json();
};
