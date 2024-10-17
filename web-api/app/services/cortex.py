import json

import snowflake.cortex
from snowflake.cortex._complete import ConversationMessage
from snowflake.snowpark import Session as SnowflakeSession

import app.services.data as data
from app.schemas import GenerationOutput
from app.services.measurement import ExecutionTimer
from app.services.error_handling import ExternalServiceError

SERVICE_NAME = "Snowflake Cortex"

# @data.inject_snowflake_session
def complete(model: str, messages: str | list[ConversationMessage], *, snowflakeSession: SnowflakeSession = None) -> GenerationOutput:
    try:
        with data.create_snowflake_session() as session, ExecutionTimer() as timer:
            stream = snowflake.cortex.Complete(model, messages, session=session, options={ "temperature": 0 }, stream=True)

            text = ""
            for update in stream:
                text += update

            completion_tokens = 0
            prompt_tokens = 0

            # response = snowflake.cortex.Complete(model, messages, session=session, options={ "temperature": 0 })
            
            # text = json.loads(response)["choices"][0]["messages"]
            # completion_tokens = json.loads(response)["usage"]["completion_tokens"]
            # prompt_tokens = json.loads(response)["usage"]["prompt_tokens"]
    except Exception as e:
            raise ExternalServiceError(SERVICE_NAME, str(e))
    
    # log_generation(database, timer.started_at, SERVICE_NAME, model, tag, completion_tokens, prompt_tokens, timer.elapsed_ms, userSession)
    return GenerationOutput(
        text=text,
        generatedAt=timer.started_at,
        service=SERVICE_NAME,
        model=model,
        completionTokens=completion_tokens,
        promptTokens=prompt_tokens,
        timeToGenerate=timer.elapsed_ms,
    )
