from collections.abc import Iterable
from datetime import datetime
from typing import BinaryIO, cast

import openai
from openai import AsyncOpenAI, NotGiven, OpenAI
from openai.types.chat import ChatCompletionMessageParam

from app.errors import (
    ExternalServiceError,
    ExternalServiceInterruption,
    ExternalServiceTimeout,
)
from app.schemas import GenerationOutput, LanguageModel, TranscriptionOutput
from app.services.adapters import GenerativeAIService, TranscriptionService
from app.utility.timing import ExecutionTimer


class OpenAITranscriptionService(TranscriptionService):
    @property
    def service_name(self):
        return "OpenAI Whisper"

    async def transcribe(
        self,
        audio_file: BinaryIO,
        filename: str,
        content_type: str,
        prompt: str | None = None,
    ) -> TranscriptionOutput:
        try:
            openai_client = AsyncOpenAI(timeout=None, max_retries=0)
            response = await openai_client.audio.transcriptions.create(
                model="whisper-1",
                file=(filename, audio_file, content_type),
                prompt=prompt or NotGiven(),
            )
            transcript = response.text
        except openai.APITimeoutError as e:
            raise ExternalServiceTimeout(self.service_name, str(e))
        except (
            openai.ConflictError,
            openai.InternalServerError,
            openai.RateLimitError,
            openai.UnprocessableEntityError,
        ) as e:
            raise ExternalServiceInterruption(self.service_name, str(e))
        except Exception as e:
            raise ExternalServiceError(self.service_name, str(e))

        return TranscriptionOutput(
            transcript=transcript,
            service=self.service_name,
        )


class OpenAIGenerativeAIService(GenerativeAIService):
    @property
    def service_name(self):
        return "OpenAI"

    @property
    def models(self):
        return [LanguageModel(name="gpt-4o", size="Large")]

    def complete(
        self,
        model: str,
        messages: str | list[dict[str, str]],
        temperature: int = 0,
    ) -> GenerationOutput:
        try:
            with ExecutionTimer() as timer:
                openai_client = OpenAI(timeout=None, max_retries=0)
                response = openai_client.chat.completions.create(
                    model=model,
                    messages=cast(Iterable[ChatCompletionMessageParam], messages),
                    temperature=temperature,
                )

                text = response.choices[0].message.content
                completion_tokens = (
                    0 if response.usage is None else response.usage.completion_tokens
                )
                prompt_tokens = (
                    0 if response.usage is None else response.usage.prompt_tokens
                )

        except openai.APITimeoutError as e:
            raise ExternalServiceTimeout(self.service_name, str(e))
        except (
            openai.ConflictError,
            openai.InternalServerError,
            openai.RateLimitError,
            openai.UnprocessableEntityError,
        ) as e:
            raise ExternalServiceInterruption(self.service_name, str(e))
        except Exception as e:
            raise ExternalServiceError(self.service_name, str(e))

        return GenerationOutput(
            text=text or "",
            generatedAt=cast(datetime, timer.started_at),
            service=self.service_name,
            model=model,
            completionTokens=completion_tokens,
            promptTokens=prompt_tokens,
            timeToGenerate=cast(int, timer.elapsed_ms),
        )
