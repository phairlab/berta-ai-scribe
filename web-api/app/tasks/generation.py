import app.schemas as sch
import app.services.openai as openai
import app.services.cortex as cortex
import app.services.error_handling as errors
from app.services.logging import WebAPILogger
from app.config import settings

log = WebAPILogger(__name__)

if settings.GENERATIVE_AI_SERVICE not in ["OPENAI", "SNOWFLAKE_CORTEX"]:
    raise Exception(f"Invalid generative AI service: {settings.GENERATIVE_AI_SERVICE}")

generative_ai_service = openai if settings.GENERATIVE_AI_SERVICE == "OPENAI" else cortex

PLAINTEXT_NOTE_SYSTEM_PROMPT = """
Format your responses plain text only, do not include any markdown syntax.
After a heading or subheading line, the section content should follow on the immediate next line.
""".strip()

MARKDOWN_NOTE_SYSTEM_PROMPT = """
You are a specialist at reading audio transcripts and precisely following instructions for summarizing them in the correct format.
You will be given the audio transcript as AUDIO_TRANSCRIPT and the instructions as SUMMARY_INSTRUCTIONS.
You only ever include facts in your response when they are directly supported by AUDIO_TRANSCRIPT.
When you state any facts, you state them simply without preamble.
Do not add footnotes unless explicitly asked in SUMMARY_INSTRUCTIONS.
Format all responses as follows:
- Include section headers, paragraphs, numbered lists, and un-numbered lists in your response as appropriate.
- Do not include an overall header, only section headers.
- Format section headers like this: `# Header`.
- Format numbered lists like this: `1. List item`.
- Format un-numbered lists with a dash, like this: `- List item`.
""".strip()

def generate_note(model: str, instructions: str, transcript: str, output_type: sch.NoteOutputType = "Markdown") -> sch.GenerationOutput:
    # Configure prompt messages.
    if output_type == "Markdown":
        instructions = instructions.replace("*", "$$")
        instructions = instructions.replace("+", "$$$")
        instructions = instructions.replace("#", "$$$$")
        messages = [
            {"role": "system", "content": MARKDOWN_NOTE_SYSTEM_PROMPT},
            {"role": "user", "content": f"SUMMARY_INSTRUCTIONS:\n\"\"\"{instructions}\n\"\"\""},
            {"role": "user", "content": f"AUDIO_TRANSCRIPT:\n\"\"\"{transcript}\n\"\"\""},
        ]
    else:
        messages = [
            {"role": "system", "content": PLAINTEXT_NOTE_SYSTEM_PROMPT},
            {"role": "user", "content": instructions},
            {"role": "user", "content": transcript},
        ]

    # Return the draft note segments.
    try:
        return generative_ai_service.complete(model, messages)
    except errors.ExternalServiceError as e:
        raise e
