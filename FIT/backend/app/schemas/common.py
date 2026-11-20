"""Common Pydantic v2 response envelopes and shared enums."""

from typing import Any, Literal, Optional
from pydantic import BaseModel, Field

RoleLiteral = Literal["user", "admin"]
GenderLiteral = Literal["male", "female", "unisex"]
FitPreferenceLiteral = Literal["slim", "regular", "relaxed"]
UnitLiteral = Literal["cm", "in"]
WeightUnitLiteral = Literal["kg", "lbs"]
CategoryCodeLiteral = Literal[
    "mens_tops",
    "womens_tops",
    "mens_bottoms",
    "womens_bottoms",
    "womens_dresses",
]
VerificationStatusLiteral = Literal["verified", "estimated"]
FitCategoryLiteral = Literal["too_tight", "good_fit", "loose"]
OverallFitFeedbackLiteral = Literal[
    "too_small",
    "slightly_small",
    "perfect",
    "slightly_large",
    "too_large",
]


class MessageResponse(BaseModel):
    """Generic operation status response."""

    success: bool = True
    message: str


class ErrorDetail(BaseModel):
    """Detailed error payload returned by global exception handlers."""

    code: str
    message: str
    details: Optional[Any] = Field(default=None)


class ErrorResponse(BaseModel):
    """Standardized error envelope."""

    success: bool = False
    error: ErrorDetail
