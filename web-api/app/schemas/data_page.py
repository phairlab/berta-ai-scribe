from typing import Generic, TypeVar

import pydantic.generics

T = TypeVar("T")

class DataPage(pydantic.generics.GenericModel, Generic[T]):
    data: list[T]
    isLastPage: bool
