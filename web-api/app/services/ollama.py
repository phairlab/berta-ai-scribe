from collections.abc import Iterable
from datetime import datetime
from typing import BinaryIO, cast

import aiohttp
from openai import AsyncOpenAI, NotGiven, OpenAI
from openai.types.chat import ChatCompletionMessageParam

from app.errors import (
    ExternalServiceError,
    ExternalServiceInterruption,
    ExternalServiceTimeout,
)
from app.schemas import GenerationOutput, LanguageModel
from app.services.adapters import GenerativeAIService
from app.utility.timing import ExecutionTimer


class OllamaGenerativeAIService(GenerativeAIService):
    def __init__(self, service_url: str = "http://localhost:11434"):
        self._service_url = service_url

    @property
    def service_name(self):
        return "Ollama"

    @property
    def models(self):
        return [
            LanguageModel(name="llama3.1:8b", size="Large"),
            LanguageModel(name="llama3.3:70b", size="Large"),
            LanguageModel(name="llama3.3:70b-instruct-q2_K", size="Large"),
            LanguageModel(name="llama3.1:8b-instruct-fp16", size="Large"),
        
        ]

    def complete(
        self,
        model: str,
        messages: str | list[dict[str, str]],
        temperature: int = 0,
    ) -> GenerationOutput:
        try:
            with ExecutionTimer() as timer:
                openai_client = OpenAI(
                    base_url=f"{self._service_url}/v1",
                    api_key="not-needed",
                    timeout=None,
                    max_retries=0,
                )
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