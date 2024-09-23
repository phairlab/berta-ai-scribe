from pydantic import BaseModel

class User(BaseModel):
    username: str
    rights: list[str]