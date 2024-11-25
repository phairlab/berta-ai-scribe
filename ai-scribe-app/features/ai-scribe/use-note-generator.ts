import { useState } from "react";

import { DraftNote } from "@/core/types";
import {
  createNote,
  ValidNoteType,
} from "@/services/application-state/create-note";
import { useWebApi } from "@/services/web-api/use-web-api";
import { ApplicationError } from "@/utility/errors";
import { useAbortController } from "@/utility/use-abort-controller";

type NoteGeneratorProps = {
  onGenerating?: () => void;
  onGenerated: (draftNote: DraftNote) => void;
  onError: (error: ApplicationError, retry: () => void) => void;
};

export function useNoteGenerator({
  onGenerating,
  onGenerated,
  onError,
}: NoteGeneratorProps) {
  const webApi = useWebApi();
  const controller = useAbortController();
  const [generatingNoteType, setGeneratingNoteType] = useState<ValidNoteType>();

  const generateNote = async (
    noteType: ValidNoteType,
    encounterId: string,
    transcript: string,
    includeFooter: boolean = true,
  ) => {
    if (generatingNoteType) {
      controller.abort();
    }

    onGenerating?.();
    setGeneratingNoteType(noteType);

    const abortSignal = controller.signal.current;

    try {
      const response = await webApi.tasks.generateDraftNote(
        noteType.instructions,
        transcript,
        noteType.outputType,
        abortSignal,
      );

      const draftNote: DraftNote = createNote({
        noteType: noteType,
        noteId: response.noteId,
        content: response.text,
      });

      if (includeFooter) {
        let noteFooter = [
          "Generated in part by the AHS Jenkins Scribe, with patient consent.",
          `Note ID: ${encounterId}-${draftNote.id}`,
        ]
          .map((line) => `<<${line}>>`)
          .join("\n");

        if (noteType.outputType === "Markdown") {
          // Handle encoded *, +, and # characters.
          // Add an extra newline before any * characters at the start of a line.
          draftNote.content = draftNote.content
            .replace(/\$\$\$\$/g, "\\#")
            .replace(/\$\$\$/g, "\\+")
            .replace(/\$\$/g, "\\*")
            .replace(/^\\\*.*/gm, "\n$&");

          // For the footer, escape < and >, and set to italic.
          draftNote.content += `\n\n${noteFooter.replace(/^<<(.*)>>$/gm, "*\\<\\<$1\\>\\>*")}`;
        } else {
          // Plaintext footer.
          draftNote.content += `\n\n<<${noteFooter}>>`;
        }
      }

      onGenerated(draftNote);
    } catch (e: unknown) {
      onError(e as ApplicationError, () =>
        generateNote(noteType, encounterId, transcript),
      );
    } finally {
      setGeneratingNoteType(undefined);
    }
  };

  const abort = () => {
    if (generatingNoteType) {
      controller.abort();
      setGeneratingNoteType(undefined);
    }
  };

  return { generateNote, abort, generatingNoteType } as const;
}
