import json

import snowflake.cortex
from snowflake.cortex._complete import ConversationMessage
from snowflake.snowpark import Session as SnowflakeSession

import app.services.data as data
from app.schemas import GenerationOutput
from app.services.measurement import ExecutionTimer
from app.services.error_handling import ExternalServiceError

SERVICE_NAME = "Snowflake Cortex"

@data.inject_snowflake_session
def complete(model: str, messages: str | list[ConversationMessage], *, snowflakeSession: SnowflakeSession = None) -> GenerationOutput:
    try:
        # stream = snowflake.cortex.Complete(model, messages, session=snowflakeSession, options={ "temperature": 0 }, stream=True)

        # for update in stream:
        #     yield update

        with ExecutionTimer() as timer:
            response = snowflake.cortex.Complete(model, messages, session=snowflakeSession, options={ "temperature": 0 })
            
            text = json.loads(response)["choices"][0]["messages"]
            completion_tokens = json.loads(response)["usage"]["completion_tokens"]
            prompt_tokens = json.loads(response)["usage"]["prompt_tokens"]
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
