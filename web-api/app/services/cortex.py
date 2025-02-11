import json
from collections.abc import Iterator
from datetime import datetime
from typing import cast

import snowflake.cortex as snowflake_cortex
from snowflake.cortex._complete import ConversationMessage
from snowflake.snowpark import Session

import app.services.snowflake as snowflake
from app.errors import ExternalServiceError
from app.schemas import GenerationOutput, LanguageModel
from app.services.adapters import GenerativeAIService
from app.utility.timing import ExecutionTimer


class CortexGenerativeAIService(GenerativeAIService):
    @property
    def service_name(self):
        return "Snowflake Cortex"

    @property
    def models(self):
        return [
            LanguageModel(name="claude-3-5-sonnet", size="Large"),
            LanguageModel(name="llama3.1-405b", size="Large"),
            LanguageModel(name="mistral-large2", size="Large"),
            LanguageModel(name="llama3.1-70b", size="Medium"),
            LanguageModel(name="llama3.1-8b", size="Small"),
            LanguageModel(name="llama3.2-3b", size="Small"),
            LanguageModel(name="llama3.2-1b", size="Small"),
            LanguageModel(name="mistral-7b", size="Small"),
        ]

    def _count_tokens(
        self,
        snowflakeSession: Session,
        model: str,
        messages: str | list[dict[str, str]],
        response: str,
    ) -> tuple[int, int]:
        [prompt_tokens, completion_tokens] = snowflakeSession.sql(
            """SELECT SNOWFLAKE.CORTEX.COUNT_TOKENS(?, ?)
                ,SNOWFLAKE.CORTEX.COUNT_TOKENS(?, ?);""",
            params=[model, json.dumps(messages), model, response],
        ).collect()[0]

        return cast(tuple[int, int], [prompt_tokens, completion_tokens])

    def _batch_complete(
        self,
        model: str,
        messages: str | list[dict[str, str]],
        temperature: int = 0,
    ) -> GenerationOutput:
        try:
            with snowflake.start_session() as snowflakeSession, ExecutionTimer() as timer:  # noqa
                response = cast(
                    str,
                    snowflake_cortex.Complete(
                        model,
                        cast(list[ConversationMessage], messages),
                        session=snowflakeSession,
                        options={"temperature": temperature},
                    ),
                )

                completion = json.loads(response)
                text = completion["choices"][0]["messages"]
                prompt_tokens = completion["usage"]["prompt_tokens"]
                completion_tokens = completion["usage"]["completion_tokens"]

        except Exception as e:
            raise ExternalServiceError(self.service_name, str(e))

        return GenerationOutput(
            text=cast(str, text).removeprefix("```").removesuffix("```"),
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
        messages: str | list[dict[str, str]],
        temperature: int = 0,
    ) -> GenerationOutput:
        try:
            with snowflake.start_session() as snowflakeSession, ExecutionTimer() as timer:  # noqa
                stream = snowflake_cortex.Complete(
                    model,
                    cast(list[ConversationMessage], messages),
                    session=snowflakeSession,
                    options={"temperature": temperature},
                    stream=True,
                )

                text = ""
                for update in cast(Iterator[str], stream):
                    text += update

                [prompt_tokens, completion_tokens] = self._count_tokens(
                    snowflakeSession, "llama3.1-70b", messages, text
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
        messages: list[dict[str, str]],
        temperature: int = 0,
    ) -> GenerationOutput:
        # Some models in cortex only support a single message of each type.
        system_message = "\n\n".join(
            [m["content"] for m in messages if m["role"] == "system"]
        )
        user_message = "\n\n".join(
            m["content"] for m in messages if m["role"] == "user"
        )

        cortex_messages = [
            {"role": "system", "content": system_message},
            {"role": "user", "content": user_message},
        ]

        return self._stream_complete(model, cortex_messages, temperature)
