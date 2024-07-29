"use server";

import * as Data from "@/data-models";

export const transcribeAudio = async (
  formData: FormData,
): Promise<Data.Transcript> => {
  const response = await fetch(
    `${process.env.APP_API_URL}/transcripts/create`,
    {
      method: "POST",
      body: formData,
    },
  );

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.json();
};

export const generateNote = async (
  transcript: string,
  summaryType: string,
): Promise<Data.GeneratedNote> => {
  const response = await fetch(`${process.env.APP_API_URL}/summaries/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      transcript: transcript,
      summaryType: summaryType,
    }),
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.json();
};
