"""Pydantic v2 schemas for Browser Extension REST endpoints."""

from typing import List, Optional

from pydantic import BaseModel, Field

from app.schemas.common import CategoryCodeLiteral, FitPreferenceLiteral
from app.schemas.recommendation import RecommendationResponse


class ExtensionProductLookupRequest(BaseModel):
    """Payload sent by the browser extension to check if a page/product is supported."""

    page_url: str = Field(..., min_length=5, max_length=1000)
    external_product_id: Optional[str] = Field(default=None, max_length=150)
    product_title: Optional[str] = Field(default=None, max_length=255)
    brand_name: Optional[str] = Field(default=None, max_length=150)


class ExtensionLookupResponse(BaseModel):
    """Graceful structured response indicating whether the website/product is supported."""

    supported: bool
    message: str
    domain: Optional[str] = None
    brand_id: Optional[int] = None
    brand_name: Optional[str] = None
    product_id: Optional[int] = None
    product_name: Optional[str] = None
    category_code: Optional[str] = None
    available_sizes: List[str] = []


class ExtensionRecommendRequest(BaseModel):
    """Payload sent by the browser extension to get an instant size recommendation."""

    page_url: str = Field(..., min_length=5, max_length=1000)
    external_product_id: Optional[str] = Field(default=None, max_length=150)
    product_id: Optional[int] = Field(default=None, gt=0)
    brand_name: Optional[str] = Field(default=None, max_length=150)
    category_code: Optional[CategoryCodeLiteral] = None
    measurement_profile_id: Optional[int] = Field(default=None, gt=0)
    fit_preference_override: Optional[FitPreferenceLiteral] = None


class ExtensionRecommendResponse(BaseModel):
    """Structured recommendation response for the browser extension (handles unsupported sites cleanly)."""

    supported: bool
    message: str
    user_measurement_profile_id: Optional[int] = None
    recommendation: Optional[RecommendationResponse] = None
