import {
  DraftNote,
  Encounter,
  IncompleteNoteType,
  NoteType,
} from "@/core/types";
import { createNote } from "@/services/state/create-note";
import { useWebApi } from "@/services/web-api/use-web-api";
import { asApplicationError } from "@/utility/errors";
import { RequiredFields } from "@/utility/typing";

export function useNoteGenerator() {
  const webApi = useWebApi();

  const generateNote = async (
    encounter: Pick<Encounter, "id">,
    noteType: NoteType | RequiredFields<IncompleteNoteType, "instructions">,
    context: string | undefined,
    transcript: string,
    abortSignal: AbortSignal,
    options?: { includeFooter?: boolean },
  ) => {
    try {
      const response = await webApi.tasks.generateDraftNote(
        noteType.instructions,
        transcript,
        noteType.outputType,
        context,
        noteType.model,
        abortSignal,
      );

      const draftNote: DraftNote = createNote(
        noteType,
        response.noteId,
        response.text,
        noteType.model,
      );

      if (options?.includeFooter) {
        let noteFooter = [
          "Generated in part by Jenkins Scribe, with patient consent where applicable.",
          `Note ID: ${encounter.id}-${draftNote.id}`,
        ]
          .map((line) => `<<${line}>>`)
          .join("\n");

        if (noteType.outputType === "Markdown") {
          // For the footer, escape < and >, and set to italic.
          draftNote.content += `\n\n${noteFooter.replace(/^<<(.*)>>$/gm, "*\\<\\<$1\\>\\>*")}`;
        } else {
          // Plaintext footer.
          draftNote.content += `\n\n<<${noteFooter}>>`;
        }
      }

      if (noteType.outputType === "Markdown") {
        // Handle encoded *, +, and # characters.
        // Add an extra newline before any * characters at the start of a line.
        draftNote.content = draftNote.content
          .replace(/\$\$\$\$/g, "\\#")
          .replace(/\$\$\$/g, "\\+")
          .replace(/\$\$/g, "\\*")
          .replace(/^\\\*.*/gm, "\n$&");
      }

      return draftNote;
    } catch (ex: unknown) {
      throw asApplicationError(ex);
    }
  };

  return { generateNote };
}
