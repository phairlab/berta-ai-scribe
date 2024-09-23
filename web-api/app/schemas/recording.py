from pydantic import BaseModel

import app.services.db as db

class Recording(BaseModel):
    filename: str
    mediaType: str
    duration: int
    transcript: str | None = None
    transcriptionService: str | None = None
    timeToTranscribe: int | None = None

    @staticmethod
    def from_db_record(record: db.Recording):
        return Recording(
            filename=record.filename,
            mediaType=record.media_type,
            duration=record.duration,
            transcript=record.transcript,
            transcriptionService=record.transcription_service,
            timeToTranscribe=record.time_to_transcribe,
        )
