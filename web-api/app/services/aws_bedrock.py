# app/services/bedrock.py
import json
from collections.abc import Iterator
from datetime import datetime
from typing import Any, Dict, List, cast

import boto3
from botocore.exceptions import BotoCoreError, ClientError

from app.errors import ExternalServiceError
from app.schemas import GenerationOutput, LanguageModel
from app.services.adapters import GenerativeAIService
from app.utility.timing import ExecutionTimer

CONTENT_TYPE = "application/json"
ACCEPT = "application/json"


class BedrockGenerativeAIService(GenerativeAIService):
    def __init__(self, region_name: str | None = None) -> None:
        try:
            self.runtime = boto3.client(
                "bedrock-runtime",
                region_name=region_name or "us-west-2",
            )
        except (BotoCoreError, ClientError) as e:
            raise ExternalServiceError("AWS Bedrock", str(e))

    @property
    def service_name(self):
        return "AWS Bedrock"

    @property
    def models(self):
        return [
            LanguageModel(name="us.meta.llama3-3-70b-instruct-v1:0", size="Large"),
            LanguageModel(name="meta.llama3-1-405b-instruct-v1:0", size="Large"),
            LanguageModel(name="meta.llama3-1-70b-instruct-v1:0", size="Large"),
            LanguageModel(name="anthropic.claude-3-7-sonnet-20250219-v1:0", size="Large"),
        ]

    @staticmethod
    def _count_tokens(
        _,
        __, 
        ___,  
        response: str,
    ) -> tuple[int, int]:
        """Rough token heuristic – 4 chars ≈ 1 token."""
        total_chars = len(response)
        return (total_chars // 4, 0)  

    def _batch_complete(
        self,
        model: str,
        messages: str | List[Dict[str, str]],
        temperature: int = 0,
    ) -> GenerationOutput:
        try:
            with ExecutionTimer() as timer:
                body = self._format_messages(model, messages, temperature)

                resp = self.runtime.invoke_model(
                    modelId=model,
                    contentType=CONTENT_TYPE,
                    accept=ACCEPT,
                    body=json.dumps(body),
                )

                answer = self._extract_text(model, json.loads(resp["body"].read()))
                prompt_tokens, completion_tokens = self._count_tokens(
                    None, None, None, answer
                )

        except Exception as e:
            raise ExternalServiceError(self.service_name, str(e))

        return GenerationOutput(
            text=answer.removeprefix("```").removesuffix("```"),
            generatedAt=cast(datetime, timer.started_at),
            service=self.service_name,
            model=model,
            completionTokens=completion_tokens,
            promptTokens=prompt_tokens,
            timeToGenerate=cast(int, timer.elapsed_ms),
        )

    def _stream_complete(
        self,
        model: str,
        messages: str | List[Dict[str, str]],
        temperature: int = 0,
    ) -> GenerationOutput:
        try:
            with ExecutionTimer() as timer:
                body = self._format_messages(model, messages, temperature)

                stream = self.runtime.invoke_model_with_response_stream(
                    modelId=model,
                    contentType=CONTENT_TYPE,
                    accept=ACCEPT,
                    body=json.dumps(body),
                )

                text = ""
                for event in cast(Iterator[Dict[str, Any]], stream["body"]):
                    text += self._extract_chunk(
                        model, json.loads(event["chunk"]["bytes"])
                    )
                prompt_tokens, completion_tokens = self._count_tokens(
                    None, None, None, text
                )

        except Exception as e:
            raise ExternalServiceError(self.service_name, str(e))

        return GenerationOutput(
            text=text.removeprefix("```").removesuffix("```"),
            generatedAt=cast(datetime, timer.started_at),
            service=self.service_name,
            model=model,
            completionTokens=completion_tokens,
            promptTokens=prompt_tokens,
            timeToGenerate=cast(int, timer.elapsed_ms),
        )

    def complete(
        self,
        model: str,
        messages: List[Dict[str, str]],
        temperature: int = 0,
    ) -> GenerationOutput:
        system_message = "\n\n".join(
            m["content"] for m in messages if m["role"] == "system"
        )
        user_message = "\n\n".join(
            m["content"] for m in messages if m["role"] == "user"
        )

        conv_messages = [
            {"role": "system", "content": system_message},
            {"role": "user", "content": user_message},
        ]

        return self._stream_complete(model, conv_messages, temperature)

    def _format_messages(
        self,
        model: str,
        messages: str | List[Dict[str, str]],
        temperature: int,
    ) -> Dict[str, Any]:
        """Minimal prompt building for Claude 3 and Llama 3."""
        if model.startswith("anthropic.claude-3"):
        
            return {
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": 4096,
                "temperature": temperature,
                "messages": [
                    {
                        "role": m["role"],
                        "content": [{"type": "text", "text": m["content"]}],
                    }
                    for m in cast(List[Dict[str, str]], messages)
                ],
            }

       
        prompt = "<|begin_of_text|>"
        for m in cast(List[Dict[str, str]], messages):
            role_tag = m["role"]
            prompt += (
                f"<|start_header_id|>{role_tag}<|end_header_id|>\n"
                f"{m['content']}\n<|eot_id|>\n"
            )
        prompt += "<|start_header_id|>assistant<|end_header_id|>"

        return {
            "prompt": prompt,
            "max_gen_len": 4096,
            "temperature": temperature,
        }

    @staticmethod
    def _extract_text(model: str, payload: Dict[str, Any]) -> str:
        if model.startswith("anthropic.claude-3"):
            return "".join(
                p.get("text", "")
                for p in payload.get("content", [])
                if p.get("type") == "text"
            )
        return payload.get("generation", "")  # Llama 3

    @staticmethod
    def _extract_chunk(model: str, chunk: Dict[str, Any]) -> str:
        if model.startswith("anthropic.claude-3"):
            delta = chunk.get("delta", {})
            if "text" in delta:
                return delta["text"]
            return "".join(
                p.get("text", "")
                for p in delta.get("content", [])
                if p.get("type") == "text"
            )
        return chunk.get("generation", "")  # Llama 3
