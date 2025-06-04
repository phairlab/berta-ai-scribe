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
        self.api_url = api_url
        
        if not self.api_url and not VLLM_AVAILABLE:
            logger.warning("VLLM package not installed. Only API server mode is available.")
            self._available_models = []
            return

        self.model_dir = Path(".models")
        self.model_dir.mkdir(exist_ok=True)
        
        if self.api_url:
            logger.info(f"VLLM service initialized with API URL: {self.api_url}")
            self._available_models = self._get_available_models()
        else:
            try:
                self._download_model()
                
                self.llm = LLM(
                    model=str(self.model_dir / settings.VLLM_MODEL_NAME),
                    trust_remote_code=True
                )
                logger.info("VLLM service initialized with direct integration")
                self._available_models = self._get_local_models()
            except Exception as e:
                logger.error(f"Error initializing VLLM: {str(e)}")
                raise ExternalServiceError("VLLM", str(e))
    
    def _download_model(self) -> None:
        if not settings.HUGGINGFACE_TOKEN:
            raise ExternalServiceError(
                "VLLM",
                "Hugging Face token is required. Set HUGGINGFACE_TOKEN in your environment."
            )
            
        model_path = self.model_dir / settings.VLLM_MODEL_NAME
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
                local_dir_use_symlinks=False
            )
            logger.info("Model download completed")
        except ImportError:
            raise ExternalServiceError(
                "VLLM",
                "huggingface_hub package is required for model downloading. Install it with: pip install huggingface_hub"
            )
        except Exception as e:
            logger.error(f"Error downloading model: {str(e)}")
            raise ExternalServiceError("VLLM", f"Failed to download model: {str(e)}")
    
    def _get_local_models(self) -> List[Dict]:
        return [{"id": settings.VLLM_MODEL_NAME}]
    
    def _get_headers(self) -> Dict[str, str]:
        headers = {
            "Content-Type": "application/json"
        }
        
        if settings.HUGGINGFACE_TOKEN:
            headers["Authorization"] = f"Bearer {settings.HUGGINGFACE_TOKEN}"
            
        return headers
    
    def _get_available_models(self) -> List[Dict]:
        if self.api_url:
            try:
                response = requests.get(
                    f"{self.api_url}/models",
                    headers=self._get_headers()
                )
                if response.status_code == 200:
                    return response.json()['data']
                else:
                    logger.error(f"Error getting models: {response.status_code}")
                    logger.error(response.text)
                    return []
            except Exception as e:
                logger.error(f"Error connecting to VLLM server: {str(e)}")
                return []
        else:
            return self._get_local_models()
    
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
                    data = {
                        "model": model,
                        "messages": messages,
                        "temperature": temperature,
                        "max_tokens": 4096
                    }
                    
                    logger.info(f"Sending request to {self.api_url}/chat/completions")
                    logger.debug(f"Request data: {json.dumps(data, indent=2)}")
                    
                    response = requests.post(
                        f"{self.api_url}/chat/completions",
                        headers=self._get_headers(),
                        json=data
                    )
                    
                    if response.status_code == 200:
                        result = response.json()
                        text = result['choices'][0]['message']['content']
                        usage = result.get('usage', {})
                        completion_tokens = usage.get('completion_tokens', 0)
                        prompt_tokens = usage.get('prompt_tokens', 0)
                    else:
                        error_msg = f"VLLM API error: {response.status_code}"
                        logger.error(f"{error_msg} - {response.text}")
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