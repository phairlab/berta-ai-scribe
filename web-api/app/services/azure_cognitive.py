from collections.abc import Iterable
from datetime import datetime
from typing import cast

import openai
from azure.identity import EnvironmentCredential, get_bearer_token_provider
from openai import AzureOpenAI
from openai.types.chat import ChatCompletionMessageParam

from app.config import settings
from app.errors import (
    ExternalServiceError,
    ExternalServiceInterruption,
    ExternalServiceTimeout,
    WebAPIException,
)
from app.schemas import GenerationOutput, LanguageModel
from app.services.adapters import GenerativeAIService
from app.utility.timing import ExecutionTimer


class AzureCognitiveGenerativeAIService(GenerativeAIService):
    @property
    def service_name(self):
        return "Azure Cognitive Services"

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
            if settings.AZURE_OPENAI_ENDPOINT is None:
                raise WebAPIException(
                    "A configuration error is preventing communication to an AI service"
                )

            with ExecutionTimer() as timer:
                token_provider = get_bearer_token_provider(
                    EnvironmentCredential(),
                    "https://cognitiveservices.azure.com/.default",
                )

                api_version = settings.AZURE_API_VERSION
                endpoint = settings.AZURE_OPENAI_ENDPOINT or ""

                openai_client = AzureOpenAI(
                    api_version=api_version,
                    azure_endpoint=endpoint,
                    azure_ad_token_provider=token_provider,
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
