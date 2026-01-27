# Copyright 2025 Ross Mitchell
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

from datetime import datetime
from typing import List, Dict, cast
import requests
import json
import logging

from app.errors import ExternalServiceError
from app.schemas import GenerationOutput, LanguageModel
from app.services.adapters import GenerativeAIService
from app.utility.timing import ExecutionTimer
from app.config import settings

logger = logging.getLogger(__name__)


class LlamaCppGenerativeAIService(GenerativeAIService):
    """
    Service for connecting to llama.cpp server (llama-server).

    llama-server provides an OpenAI-compatible API and is optimized for
    NVIDIA GPUs including DGX Spark with Blackwell architecture.

    Start the server with:
        llama-server -m model.gguf -ngl 99 -c 4096 --host 0.0.0.0 --port 8080
    """

    def __init__(self, api_url: str = None):
        self.api_url = api_url or getattr(settings, 'LLAMA_CPP_SERVER_URL', 'http://localhost:8080')

        if not self.api_url:
            logger.warning("LlamaCpp API URL not configured")
            self._available_models = []
            return

        logger.info(f"LlamaCpp service initialized with API URL: {self.api_url}")
        try:
            self._available_models = self._get_available_models()
            logger.info(f"Successfully connected to llama-server. Available models: {[m['id'] for m in self._available_models]}")
        except Exception as e:
            logger.error(f"Failed to connect to llama-server: {str(e)}")
            self._available_models = []

    def _get_headers(self) -> Dict[str, str]:
        return {"Content-Type": "application/json"}

    def _get_available_models(self) -> List[Dict]:
        try:
            logger.info(f"Fetching available models from {self.api_url}/v1/models")
            response = requests.get(
                f"{self.api_url}/v1/models",
                headers=self._get_headers(),
                timeout=10
            )
            if response.status_code == 200:
                models = response.json().get('data', [])
                logger.info(f"Available models: {json.dumps(models, indent=2)}")
                return models
            else:
                error_msg = f"Error getting models: {response.status_code} - {response.text}"
                logger.error(error_msg)
                return []
        except requests.exceptions.ConnectionError as e:
            error_msg = f"Could not connect to llama-server at {self.api_url}. Is the server running?"
            logger.error(error_msg)
            return []
        except Exception as e:
            error_msg = f"Error connecting to llama-server: {str(e)}"
            logger.error(error_msg)
            return []

    @property
    def service_name(self) -> str:
        return "LlamaCpp"

    @property
    def models(self) -> List[LanguageModel]:
        return [
            LanguageModel(name=model['id'], size="Large")
            for model in self._available_models
        ]

    def complete(
        self,
        model: str,
        messages: List[Dict[str, str]],
        temperature: int = 0,
    ) -> GenerationOutput:
        if not self._available_models:
            raise ExternalServiceError(
                self.service_name,
                f"llama-server at {self.api_url} is not available or has no models loaded. "
                "Start llama-server first with: llama-server -m model.gguf -ngl 99 --port 8080"
            )

        try:
            with ExecutionTimer() as timer:
                # Find the requested model or use the first available
                available_model = next(
                    (m for m in self._available_models if m['id'] == model),
                    self._available_models[0] if self._available_models else None
                )

                if not available_model:
                    raise ExternalServiceError(
                        self.service_name,
                        f"Model {model} not found. Available: {[m['id'] for m in self._available_models]}"
                    )

                data = {
                    "model": available_model['id'],
                    "messages": messages,
                    "temperature": temperature,
                    "max_tokens": 4096
                }

                logger.info(f"Sending request to {self.api_url}/v1/chat/completions")
                logger.debug(f"Request data: {json.dumps(data, indent=2)}")

                try:
                    response = requests.post(
                        f"{self.api_url}/v1/chat/completions",
                        headers=self._get_headers(),
                        json=data,
                        timeout=300  # 5 minutes for large models
                    )

                    if response.status_code == 200:
                        result = response.json()
                        text = result['choices'][0]['message']['content']
                        usage = result.get('usage', {})
                        completion_tokens = usage.get('completion_tokens', 0)
                        prompt_tokens = usage.get('prompt_tokens', 0)

                        # Log performance metrics if available
                        timings = result.get('timings', {})
                        if timings:
                            logger.info(
                                f"LlamaCpp timings - Prompt: {timings.get('prompt_per_second', 0):.1f} t/s, "
                                f"Generation: {timings.get('predicted_per_second', 0):.1f} t/s"
                            )
                    else:
                        error_msg = f"llama-server API error: {response.status_code} - {response.text}"
                        logger.error(error_msg)
                        raise ExternalServiceError(self.service_name, error_msg)

                except requests.exceptions.ConnectionError as e:
                    error_msg = f"Could not connect to llama-server at {self.api_url}. Is the server running?"
                    logger.error(error_msg)
                    raise ExternalServiceError(self.service_name, error_msg)
                except requests.exceptions.Timeout as e:
                    error_msg = f"Request to llama-server timed out after 300 seconds"
                    logger.error(error_msg)
                    raise ExternalServiceError(self.service_name, error_msg)

        except ExternalServiceError:
            raise
        except Exception as e:
            logger.error(f"Error generating completion: {str(e)}")
            raise ExternalServiceError(self.service_name, str(e))

        return GenerationOutput(
            text=text,
            generatedAt=cast(datetime, timer.started_at),
            service=self.service_name,
            model=model,
            completionTokens=completion_tokens,
            promptTokens=prompt_tokens,
            timeToGenerate=cast(int, timer.elapsed_ms),
        )
