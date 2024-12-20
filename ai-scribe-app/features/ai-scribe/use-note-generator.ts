import {
  DraftNote,
  Encounter,
  IncompleteNoteType,
  NoteType,
} from "@/core/types";
import { createNote } from "@/services/application-state/create-note";
import { useWebApi } from "@/services/web-api/use-web-api";
import { asApplicationError } from "@/utility/errors";
import { RequiredFields } from "@/utility/typing";

export function useNoteGenerator() {
  const webApi = useWebApi();

  const generateNote = async (
    encounter: Pick<Encounter, "id">,
    noteType: NoteType | RequiredFields<IncompleteNoteType, "instructions">,
    transcript: string,
    abortSignal: AbortSignal,
    options?: { includeFooter?: boolean },
  ) => {
    try {
      const response = await webApi.tasks.generateDraftNote(
        noteType.instructions,
        transcript,
        noteType.outputType,
        abortSignal,
      );

      const draftNote: DraftNote = createNote(
        noteType,
        response.noteId,
        response.text,
      );

      if (options?.includeFooter) {
        let noteFooter = [
          "Generated in part by the AHS Jenkins Scribe, with patient consent.",
          `Note ID: ${encounter.id}-${draftNote.id}`,
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

      return draftNote;
    } catch (ex: unknown) {
      throw asApplicationError(ex);
    }
  };

  return { generateNote };
}
