from datetime import datetime
from typing import List, Dict, cast, Optional
import requests
import json
import logging
import os
from pathlib import Path

from app.config.package_checks import VLLM_AVAILABLE
from app.errors import ExternalServiceError
from app.schemas import GenerationOutput, LanguageModel
from app.services.adapters import GenerativeAIService
from app.utility.timing import ExecutionTimer
from app.config import settings

try:
    from vllm import LLM, SamplingParams
    from vllm.outputs import RequestOutput
except ImportError:
    VLLM_AVAILABLE = False

logger = logging.getLogger(__name__)

class VLLMService(GenerativeAIService):
    
    def __init__(self, api_url: Optional[str] = None):
        self.api_url = api_url or f"http://{settings.VLLM_SERVER_NAME}:{settings.VLLM_SERVER_PORT}"
        
        if not self.api_url:
            logger.warning("VLLM API URL not configured")
            self._available_models = []
            return

        logger.info(f"VLLM service initialized with API URL: {self.api_url}")
        try:
            self._available_models = self._get_available_models()
            logger.info(f"Successfully connected to VLLM server. Available models: {self._available_models}")
        except Exception as e:
            logger.error(f"Failed to connect to VLLM server: {str(e)}")
            raise ExternalServiceError("VLLM", f"Failed to connect to VLLM server: {str(e)}")
    
    def _download_model(self) -> None:
        if not settings.HUGGINGFACE_TOKEN:
            raise ExternalServiceError(
                "VLLM",
                "Hugging Face token is required. Set HUGGINGFACE_TOKEN in your environment.",
            )
            
        # Extract model name from path if it's a full path
        model_name = settings.VLLM_MODEL_NAME.split("/")[-1]
        model_path = self.model_dir / model_name
        
        if model_path.exists():
            logger.info(f"Model already exists at {model_path}")
            return
            
        try:
            logger.info(f"Downloading model {settings.VLLM_MODEL_NAME}...")
            import huggingface_hub
            huggingface_hub.snapshot_download(
                repo_id=settings.VLLM_MODEL_NAME,
                token=settings.HUGGINGFACE_TOKEN,
                local_dir=str(model_path),
                local_dir_use_symlinks=False,
            )
            logger.info("Model download completed")
        except ImportError:
            raise ExternalServiceError(
                "VLLM",
                "huggingface_hub package is required for model downloading. Install it with: pip install huggingface_hub",
            )
        except Exception as e:
            logger.error(f"Error downloading model: {str(e)}")
            raise ExternalServiceError("VLLM", f"Failed to download model: {str(e)}")
    
    def _get_local_models(self) -> List[Dict]:
        model_name = settings.VLLM_MODEL_NAME.split("/")[-1]
        return [{"id": model_name}]
    
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
                models = response.json()['data']
                logger.info(f"Available models: {json.dumps(models, indent=2)}")
                return models
            else:
                error_msg = f"Error getting models: {response.status_code} - {response.text}"
                logger.error(error_msg)
                raise ExternalServiceError(self.service_name, error_msg)
        except requests.exceptions.ConnectionError as e:
            error_msg = f"Could not connect to VLLM server at {self.api_url}. Is the server running?"
            logger.error(error_msg)
            raise ExternalServiceError(self.service_name, error_msg)
        except Exception as e:
            error_msg = f"Error connecting to VLLM server: {str(e)}"
            logger.error(error_msg)
            raise ExternalServiceError(self.service_name, error_msg)
    
    @property
    def service_name(self) -> str:
        return "VLLM"
    
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
                "VLLM service is not properly configured. Check server URL or local setup."
            )
            
        try:
            with ExecutionTimer() as timer:
                if self.api_url:
                    available_model = next(
                        (m for m in self._available_models if m['id'].endswith(model.split('/')[-1])),
                        None
                    )
                    
                    if not available_model:
                        raise ExternalServiceError(
                            self.service_name,
                            f"Model {model} not found in available models: {[m['id'] for m in self._available_models]}"
                        )
                    
                    data = {
                        "model": available_model['id'],  
                        "messages": messages,
                        "temperature": temperature,
                        "max_tokens": 1024
                    }
                    
                    logger.info(f"Sending request to {self.api_url}/v1/chat/completions")
                    logger.debug(f"Request data: {json.dumps(data, indent=2)}")
                    
                    try:
                        response = requests.post(
                            f"{self.api_url}/v1/chat/completions",
                            headers=self._get_headers(),
                            json=data,
                            timeout=120
                        )
                        
                        if response.status_code == 200:
                            result = response.json()
                            text = result['choices'][0]['message']['content']
                            usage = result.get('usage', {})
                            completion_tokens = usage.get('completion_tokens', 0)
                            prompt_tokens = usage.get('prompt_tokens', 0)
                        else:
                            error_msg = f"VLLM API error: {response.status_code} - {response.text}"
                            logger.error(error_msg)
                            raise ExternalServiceError(self.service_name, error_msg)
                    except requests.exceptions.ConnectionError as e:
                        error_msg = f"Could not connect to VLLM server at {self.api_url}. Is the server running?"
                        logger.error(error_msg)
                        raise ExternalServiceError(self.service_name, error_msg)
                    except requests.exceptions.Timeout as e:
                        error_msg = f"Request to VLLM server timed out after 120 seconds"
                        logger.error(error_msg)
                        raise ExternalServiceError(self.service_name, error_msg)
                else:
                    if not VLLM_AVAILABLE:
                        raise ExternalServiceError(
                            self.service_name,
                            "VLLM package is not installed. Install it with: pip install vllm"
                        )
                        
                    prompt = self._format_messages(messages)
                    sampling_params = SamplingParams(
                        temperature=temperature,
                        max_tokens=4096,
                    )
                    
                    outputs = self.llm.generate(prompt, sampling_params)
                    output = cast(RequestOutput, outputs[0])
                    text = output.outputs[0].text
                    
                    completion_tokens = len(text) // 4
                    prompt_tokens = len(prompt) // 4
                
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
    
    def _format_messages(self, messages: List[Dict[str, str]]) -> str:
        formatted_prompt = ""
        
        for message in messages:
            role = message["role"]
            content = message["content"]
            
            if role == "system":
                formatted_prompt += f"<s>[INST] <<SYS>>\n{content}\n<</SYS>>\n\n"
            elif role == "user":
                formatted_prompt += f"{content} [/INST]"
            elif role == "assistant":
                formatted_prompt += f" {content} </s><s>[INST] "
                
        return formatted_prompt