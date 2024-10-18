import json

import snowflake.cortex
from snowflake.cortex._complete import ConversationMessage

import app.services.data as data
from app.schemas import GenerationOutput
from app.services.measurement import ExecutionTimer
from app.services.error_handling import ExternalServiceError

SERVICE_NAME = "Snowflake Cortex"

def complete(model: str, messages: str | list[ConversationMessage]) -> GenerationOutput:
    try:
        with data.get_snowflake_session() as snowflakeSession, ExecutionTimer() as timer:
            stream = snowflake.cortex.Complete(model, messages, session=snowflakeSession, options={ "temperature": 0 }, stream=True)

            text = ""
            for update in stream:
                text += update
            
            [prompt_tokens, completion_tokens] = snowflakeSession.sql(
                """SELECT SNOWFLAKE.CORTEX.COUNT_TOKENS(%s, %s)
                    ,SNOWFLAKE.CORTEX.COUNT_TOKENS(%s, %s)""",
                params=[model, json.dumps(messages), model, text]
            ).collect()[0]
    except Exception as e:
            raise ExternalServiceError(SERVICE_NAME, str(e))
    
    return GenerationOutput(
        text=text,
        generatedAt=timer.started_at,
        service=SERVICE_NAME,
        model=model,
        completionTokens=completion_tokens,
        promptTokens=prompt_tokens,
        timeToGenerate=timer.elapsed_ms,
    )
