import app.errors as errors
import app.schemas as sch
from app.config.ai import (
    LABEL_TRANSCRIPT_SYSTEM_PROMPT,
    MARKDOWN_NOTE_SYSTEM_PROMPT,
    PLAINTEXT_NOTE_SYSTEM_PROMPT,
    generative_ai_services,
)
from app.logging import WebAPILogger
from app.services.adapters import GenerativeAIService

log = WebAPILogger(__name__)


def _get_service(model) -> GenerativeAIService | None:
    service = next(
        (
            service
            for service in generative_ai_services
            if any(True for m in service.models if m.name == model)
        ),
        None,
    )

    return service


def generate_note(
    model: str,
    instructions: str,
    transcript: str,
    output_type: sch.NoteOutputType = "Markdown",
) -> sch.GenerationOutput:
    service = _get_service(model)

    if service is None:
        raise errors.WebAPIException(f"Model {model} has not been configured for use")

    # Configure prompt messages.
    if output_type == "Markdown":
        instructions = instructions.replace("*", "$$")
        instructions = instructions.replace("+", "$$$")
        instructions = instructions.replace("#", "$$$$")
        messages = [
            {"role": "system", "content": MARKDOWN_NOTE_SYSTEM_PROMPT},
            {"role": "user", "content": f'Instructions:\n"""{instructions}\n"""'},
            {"role": "user", "content": f'Audio Transcript:\n"""{transcript}\n"""'},
        ]
    else:
        messages = [
            {"role": "system", "content": PLAINTEXT_NOTE_SYSTEM_PROMPT},
            {"role": "user", "content": f"{instructions}\n\n{transcript}"},
        ]

    # Return the draft note segments.
    try:
        return service.complete(model, messages)
    except errors.ExternalServiceError as e:
        raise e


def generate_transcript_label(model: str, transcript: str) -> sch.GenerationOutput:
    # Configure prompt messages.
    messages = [
        {"role": "system", "content": LABEL_TRANSCRIPT_SYSTEM_PROMPT},
        {"role": "user", "content": f'Audio Transcript:\n"""{transcript}\n"""'},
    ]

    service = _get_service(model)

    if service is None:
        raise errors.WebAPIException(
            f"Unable to generate label: model {model} has not been configured for use"
        )

    # Return the draft note segments.
    try:
        return service.complete(model, messages)
    except errors.ExternalServiceError as e:
        raise e
