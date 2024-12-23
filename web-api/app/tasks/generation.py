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
You will be given the audio transcript and instructions for creating the summary.
You only ever include facts in your response when they are directly supported by the audio transcript.
When you state any facts, you state them simply without preamble.
Do not add footnotes unless explicitly asked in the instructions.
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
            {"role": "user", "content": f"Instructions:\n\"\"\"{instructions}\n\"\"\""},
            {"role": "user", "content": f"Audio Transcript:\n\"\"\"{transcript}\n\"\"\""},
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

LABEL_TRANSCRIPT_SYSTEM_PROMPT = """
You are a specialist at reading audio transcripts and creating clear, short labels of the transcript content,
suitable for an Emergency Physician to identify it in a list.
You will be given an audio transcript and respond with the label.
Do not include formatting or header, and do not enclose the label in quotation marks.
If the audio transcript is a doctor-patient conversation or a single patient is the primary subject:
- Use the patient's chief complaint and how it occurred for the label, stated succinctly with no preamble in no more than 30 characters.
- If the transcript contains the name of the patient, prefix the label with their first name only, for example "[Name]: [Rest of label]".
- Do not include the patient's name if it is not referenced in the audio transcript.
Otherwise:
- Provide a succinct label for the audio transcript with no preamble in no more than 30 characters.
""".strip()

def generate_transcript_label(model: str, transcript: str) -> sch.GenerationOutput:
    # Configure prompt messages.
    messages = [
        {"role": "system", "content": LABEL_TRANSCRIPT_SYSTEM_PROMPT},
        {"role": "user", "content": f"Audio Transcript:\n\"\"\"{transcript}\n\"\"\""},
    ]

    # Return the draft note segments.
    try:
        return generative_ai_service.complete(model, messages)
    except errors.ExternalServiceError as e:
        raise e