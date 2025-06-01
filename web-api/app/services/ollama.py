from collections.abc import Iterable
from datetime import datetime
from typing import BinaryIO, cast, List, Dict
import requests
import logging

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

logger = logging.getLogger(__name__)

class OllamaGenerativeAIService(GenerativeAIService):
    def __init__(self, service_url: str = "http://localhost:11434"):
        self._service_url = service_url
        self._available_models = self._get_available_models()

    @property
    def service_name(self):
        return "Ollama"

    def _get_available_models(self) -> List[Dict]:
        """Fetch available models from Ollama API."""
        try:
            response = requests.get(f"{self._service_url}/api/tags")
            if response.status_code == 200:
                return response.json().get('models', [])
            else:
                logger.error(f"Error fetching Ollama models: {response.status_code}")
                logger.error(response.text)
                return []
        except Exception as e:
            logger.error(f"Error connecting to Ollama: {str(e)}")
            return []

    @property
    def models(self):
        """Get list of available models from Ollama."""
        return [
            LanguageModel(name=model['name'], size="Large")
            for model in self._available_models
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