from datetime import datetime

from pydantic import BaseModel

class UserFeedback(BaseModel):
    submitted: datetime
    details: str
