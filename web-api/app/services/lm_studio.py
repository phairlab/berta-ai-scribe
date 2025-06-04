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

class LMStudioGenerativeAIService(GenerativeAIService):
    def __init__(self, service_url: str = "http://localhost:1234"):
        self._service_url = service_url
        self._available_models = []
        try:
            self._available_models = self._get_available_models()
            if not self._available_models:
                logger.warning(f"LM Studio server at {service_url} is not responding or has no models available")
        except Exception as e:
            logger.warning(f"Could not connect to LM Studio server at {service_url}: {str(e)}")

    @property
    def service_name(self):
        return "LM Studio"

    def _get_available_models(self) -> List[Dict]:
        """Fetch available models from LM Studio API."""
        try:
            response = requests.get(f"{self._service_url}/v1/models", timeout=5)
            if response.status_code == 200:
                models = response.json().get('data', [])
                logger.info(f"Found {len(models)} models in LM Studio: {[m['id'] for m in models]}")
                return models
            else:
                logger.error(f"Error fetching LM Studio models: {response.status_code}")
                logger.error(response.text)
                return []
        except requests.exceptions.ConnectionError:
            logger.error(f"Could not connect to LM Studio server at {self._service_url}")
            return []
        except Exception as e:
            logger.error(f"Error connecting to LM Studio: {str(e)}")
            return []

    @property
    def models(self):
        """Get list of available models from LM Studio."""
        return [
            LanguageModel(name=model['id'], size="Large")
            for model in self._available_models
        ]

    def complete(
        self,
        model: str,
        messages: str | list[dict[str, str]],
        temperature: int = 0,
    ) -> GenerationOutput:
        if not self._available_models:
            raise ExternalServiceError(
                self.service_name,
                f"LM Studio server at {self._service_url} is not available or has no models loaded"
            )
            
        try:
            with ExecutionTimer() as timer:
                openai_client = OpenAI(
                    base_url=f"{self._service_url}/v1",
                    api_key="lm-studio",
                    timeout=120,  # Increased timeout to 2 minutes
                    max_retries=0,
                )
                
                # Log the request for debugging
                logger.info(f"Sending request to LM Studio with model: {model}")
                logger.debug(f"Messages: {messages}")
                
                try:
                    response = openai_client.chat.completions.create(
                        model=model,
                        messages=cast(Iterable[ChatCompletionMessageParam], messages),
                        temperature=temperature,
                        max_tokens=4096,
                        
                    )

                    text = response.choices[0].message.content
                    completion_tokens = (
                        0 if response.usage is None else response.usage.completion_tokens
                    )
                    prompt_tokens = (
                        0 if response.usage is None else response.usage.prompt_tokens
                    )

                except Exception as e:
                    logger.error(f"Error in chat completion: {str(e)}")
                    # Check if it's a timeout error
                    if "timeout" in str(e).lower():
                        raise ExternalServiceTimeout(
                            self.service_name,
                            "Request timed out. The model might be taking too long to generate a response."
                        )
                    raise

        except ExternalServiceTimeout:
            raise
        except Exception as e:
            logger.error(f"Error in LM Studio completion: {str(e)}")
            raise ExternalServiceError(
                self.service_name,
                f"Error communicating with LM Studio server: {str(e)}"
            )

        return GenerationOutput(
            text=text or "",
            generatedAt=cast(datetime, timer.started_at),
            service=self.service_name,
            model=model,
            completionTokens=completion_tokens,
            promptTokens=prompt_tokens,
            timeToGenerate=cast(int, timer.elapsed_ms),
        ) 