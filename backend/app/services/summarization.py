from openai import AsyncOpenAI

SYSTEM_PROMPT = """
You are a senior medical resident working in an Emergency Department.
I will be providing you with the complete transcript of a doctor-patient encounter.
I need you to create a succinct note that summarizes the encounter in no more than 500 words.
Please use correct medical terminology as much as possible, e.g. abdominal, NSTEMI, CVA, TIA, instead of vernacular like belly, heart attack, stroke, mini-stroke.
I would like the note divided into up to the following five sections, which also use these labels as headings on separate lines:  History of Presenting Illness, Past Medical History, Medications, Key Physical Exam Findings, and Impression/Plan.
"""

async def summarize_transcript(transcript: str) -> str:
    openai = AsyncOpenAI()
    
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": transcript}
    ]
    response = await openai.chat.completions.create(model="gpt-4o", temperature=0, messages=messages)
    summary = response.choices[0].message.content

    return summary