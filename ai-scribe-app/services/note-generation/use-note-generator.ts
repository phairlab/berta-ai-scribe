import { useState } from "react";

import { DraftNote } from "@/core/types";
import { useWebApi } from "@/services/web-api/use-web-api";
import { ApplicationError } from "@/utility/errors";
import { useAbortController } from "@/utility/use-abort-controller";

import { createNote, ValidNoteType } from "./create-note";

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
          "Generated in part by the AHS Jenkins Scribe with patient consent.",
          `Note ID: ${encounterId}-${draftNote.id}.`,
        ].join(" ");

        if (noteType.outputType === "Markdown") {
          // Escape any asterisks that are not part of matched pairs.
          // Insert a newline before asterisks that begin a line to ensure they are
          // not treated as new paragraphs.
          draftNote.content = draftNote.content
            .replace(/(?<!\*.*)\*(?!.*\*)/gm, "\\* ")
            .replace(/^\\\*.*/gm, "\n$&");

          // For the footer, escape < and >, and set to italic.
          draftNote.content += `\n\n*\\<\\<${noteFooter}\\>\\>*`;
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
