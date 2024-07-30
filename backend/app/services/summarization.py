import logging
import asyncio
import openai
from openai import AsyncOpenAI
from app.services.error_handling import AIServiceTimeout, AIServiceError, TransientAIServiceError
from app.config import settings

logger = logging.getLogger(__name__)

async def summarize_transcript(transcript: str, prompt: str) -> str:
    MAX_RETRIES = 3

    async def summarize_transcript_with_retry(transcript: str, prompt: str, retries: int = MAX_RETRIES) -> str:
        openai_client = AsyncOpenAI(timeout=settings.SUMMARIZATION_TIMEOUT, max_retries=0)
        
        try:
            messages = [
                {"role": "system", "content": "Format your responses plain text only, do not include any markdown syntax. Use asterisks before and after header text to indicate headers."},
                {"role": "system", "content": prompt},
                {"role": "user", "content": transcript}
            ]
            response = await openai_client.chat.completions.create(model="gpt-4o", temperature=0, messages=messages)
            summary = response.choices[0].message.content
        except (AIServiceTimeout, AIServiceError, TransientAIServiceError) as e:
            # Propagate service errors that have already been identified in a recursive step.
            raise e
        except openai.APITimeoutError as e:
            # Report normal timeouts and defer downstream for handling strategy.
            raise AIServiceTimeout({
                "message": f"The OpenAI API service timed out after {settings.SUMMARIZATION_TIMEOUT} seconds.",
            })
        except (openai.ConflictError, openai.InternalServerError) as e:
            # Attempt simple recovery from transient errors.
            if retries < 1:
                raise TransientAIServiceError({
                    "message": "The OpenAI API service reported a temporary issue with their service.",
                    "errorDetails": str(e),
                })
            else:
                retry_attempt = MAX_RETRIES - retries

                # Exponential falloff for wait before retry (1st: 1 second, 2nd: 3 seconds, 3rd: 9 seconds).
                retry_wait = 3**(retry_attempt) * 1000

                logger.warning(f"The OpenAI API service reported a temporary issue with their service. Attempting to retry (attempt {retry_attempt} of {MAX_RETRIES}). Error details: {str(e)}")
                
                asyncio.sleep(retry_wait)
                transcript = await summarize_transcript_with_retry(transcript, prompt, retries=(retries - 1))
        except Exception as e:
            # Handle all other service errors.
            raise AIServiceError({
                "message": "The OpenAI API service reported an issue that prevented it from fulfilling the request.",
                "errorDetails": str(e),
            })

        return summary
    
    summary = await summarize_transcript_with_retry(transcript, prompt)
    return summary