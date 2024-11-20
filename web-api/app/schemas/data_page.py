from typing import Generic, TypeVar

from pydantic import BaseModel

T = TypeVar("T")

class DataPage(BaseModel, Generic[T]):
    data: list[T]
    isLastPage: bool
