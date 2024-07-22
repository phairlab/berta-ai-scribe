from openai import AsyncOpenAI

async def summarize_transcript(transcript: str, prompt: str) -> str:
    openai = AsyncOpenAI()
    
    messages = [
        {"role": "system", "content": "Format your responses plain text only, do not include any markdown syntax."},
        {"role": "system", "content": prompt},
        {"role": "user", "content": transcript}
    ]
    response = await openai.chat.completions.create(model="gpt-4o", temperature=0, messages=messages)
    summary = response.choices[0].message.content

    return summary