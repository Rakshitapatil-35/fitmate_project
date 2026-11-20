"""Pydantic v2 schemas for Brands, Clothing Categories, Products, Size Charts, and Garment Measurements."""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.common import (
    CategoryCodeLiteral,
    FitPreferenceLiteral,
    GenderLiteral,
    VerificationStatusLiteral,
)


class BrandCreateRequest(BaseModel):
    """Payload for creating a new brand."""

    name: str = Field(..., min_length=1, max_length=150)
    slug: str = Field(..., min_length=1, max_length=150, pattern=r"^[a-z0-9-]+$")
    website_domain: Optional[str] = Field(default=None, max_length=255)
    country: Optional[str] = Field(default=None, max_length=80)
    sizing_system: str = Field(default="US/International", max_length=50)
    description: Optional[str] = None
    is_active: bool = True


class BrandUpdateRequest(BaseModel):
    """Payload for updating an existing brand."""

    name: Optional[str] = Field(default=None, min_length=1, max_length=150)
    website_domain: Optional[str] = Field(default=None, max_length=255)
    country: Optional[str] = Field(default=None, max_length=80)
    sizing_system: Optional[str] = Field(default=None, max_length=50)
    description: Optional[str] = None
    is_active: Optional[bool] = None


class BrandResponse(BaseModel):
    """Brand response schema."""

    id: int
    name: str
    slug: str
    website_domain: Optional[str] = None
    country: Optional[str] = None
    sizing_system: str
    description: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CategoryCreateRequest(BaseModel):
    """Payload for creating a clothing category."""

    code: CategoryCodeLiteral
    name: str = Field(..., min_length=2, max_length=120)
    gender: GenderLiteral
    garment_group: str = Field(..., min_length=2, max_length=32)
    description: Optional[str] = None


class CategoryResponse(BaseModel):
    """Clothing category response schema."""

    id: int
    code: str
    name: str
    gender: str
    garment_group: str
    description: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class GarmentMeasurementInput(BaseModel):
    """Input dimensions in cm for a single size within a size chart."""

    size_label: str = Field(..., min_length=1, max_length=32)
    size_order: int = Field(default=0, ge=0)
    chest_bust_cm: Optional[float] = Field(default=None, gt=0)
    underbust_cm: Optional[float] = Field(default=None, gt=0)
    shoulder_cm: Optional[float] = Field(default=None, gt=0)
    sleeve_cm: Optional[float] = Field(default=None, gt=0)
    torso_cm: Optional[float] = Field(default=None, gt=0)
    waist_cm: Optional[float] = Field(default=None, gt=0)
    hips_cm: Optional[float] = Field(default=None, gt=0)
    inseam_cm: Optional[float] = Field(default=None, gt=0)
    thigh_cm: Optional[float] = Field(default=None, gt=0)
    rise_cm: Optional[float] = Field(default=None, gt=0)
    stretch_percentage_override: Optional[float] = Field(default=None, ge=0.0, le=50.0)
    data_source: str = Field(default="brand_official_chart", max_length=150)
    verification_status: VerificationStatusLiteral = "estimated"


class GarmentMeasurementUpdateRequest(BaseModel):
    """Payload for updating garment measurements or verification status."""

    chest_bust_cm: Optional[float] = Field(default=None, gt=0)
    underbust_cm: Optional[float] = Field(default=None, gt=0)
    shoulder_cm: Optional[float] = Field(default=None, gt=0)
    sleeve_cm: Optional[float] = Field(default=None, gt=0)
    torso_cm: Optional[float] = Field(default=None, gt=0)
    waist_cm: Optional[float] = Field(default=None, gt=0)
    hips_cm: Optional[float] = Field(default=None, gt=0)
    inseam_cm: Optional[float] = Field(default=None, gt=0)
    thigh_cm: Optional[float] = Field(default=None, gt=0)
    rise_cm: Optional[float] = Field(default=None, gt=0)
    stretch_percentage_override: Optional[float] = Field(default=None, ge=0.0, le=50.0)
    data_source: Optional[str] = Field(default=None, max_length=150)
    verification_status: Optional[VerificationStatusLiteral] = None


class GarmentMeasurementResponse(BaseModel):
    """Garment measurement entry returned from a size chart."""

    id: int
    size_chart_id: int
    size_label: str
    size_order: int
    chest_bust_cm: Optional[float] = None
    underbust_cm: Optional[float] = None
    shoulder_cm: Optional[float] = None
    sleeve_cm: Optional[float] = None
    torso_cm: Optional[float] = None
    waist_cm: Optional[float] = None
    hips_cm: Optional[float] = None
    inseam_cm: Optional[float] = None
    thigh_cm: Optional[float] = None
    rise_cm: Optional[float] = None
    stretch_percentage_override: Optional[float] = None
    data_source: str
    verification_status: str
    verified_at: Optional[datetime] = None
    verified_by_user_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SizeChartCreateRequest(BaseModel):
    """Payload for creating a size chart with per-size garment measurements."""

    brand_id: int = Field(..., gt=0)
    category_id: int = Field(..., gt=0)
    product_id: Optional[int] = Field(default=None, gt=0)
    name: str = Field(..., min_length=2, max_length=200)
    source_url: Optional[str] = Field(default=None, max_length=500)
    data_source: str = Field(default="brand_official_chart", max_length=150)
    verification_status: VerificationStatusLiteral = "estimated"
    notes: Optional[str] = None
    measurements: List[GarmentMeasurementInput] = Field(..., min_length=1)


class VerificationUpdateRequest(BaseModel):
    """Admin request to mark a size chart or garment measurement as verified or estimated."""

    verification_status: VerificationStatusLiteral
    data_source: Optional[str] = Field(default=None, max_length=150)
    notes: Optional[str] = None


class SizeChartResponse(BaseModel):
    """Size chart response including all garment sizes."""

    id: int
    brand_id: int
    category_id: int
    product_id: Optional[int] = None
    name: str
    source_url: Optional[str] = None
    data_source: str
    verification_status: str
    verified_at: Optional[datetime] = None
    verified_by_user_id: Optional[int] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    garment_measurements: List[GarmentMeasurementResponse] = []

    model_config = ConfigDict(from_attributes=True)


class ProductCreateRequest(BaseModel):
    """Payload for creating a product."""

    brand_id: int = Field(..., gt=0)
    category_id: int = Field(..., gt=0)
    external_product_id: Optional[str] = Field(default=None, max_length=150)
    name: str = Field(..., min_length=2, max_length=255)
    product_url: Optional[str] = Field(default=None, max_length=500)
    description: Optional[str] = None
    primary_fabric: Optional[str] = Field(default=None, max_length=120)
    fabric_composition: Optional[str] = Field(default=None, max_length=255)
    stretch_percentage: float = Field(default=0.0, ge=0.0, le=50.0)
    intended_fit: FitPreferenceLiteral = "regular"
    available_sizes: List[str] = Field(default_factory=lambda: ["XS", "S", "M", "L", "XL", "XXL"])
    is_active: bool = True


class ProductUpdateRequest(BaseModel):
    """Payload for updating a product."""

    name: Optional[str] = Field(default=None, min_length=2, max_length=255)
    external_product_id: Optional[str] = Field(default=None, max_length=150)
    product_url: Optional[str] = Field(default=None, max_length=500)
    description: Optional[str] = None
    primary_fabric: Optional[str] = Field(default=None, max_length=120)
    fabric_composition: Optional[str] = Field(default=None, max_length=255)
    stretch_percentage: Optional[float] = Field(default=None, ge=0.0, le=50.0)
    intended_fit: Optional[FitPreferenceLiteral] = None
    available_sizes: Optional[List[str]] = None
    is_active: Optional[bool] = None


class ProductResponse(BaseModel):
    """Product response schema."""

    id: int
    brand_id: int
    category_id: int
    brand_name: Optional[str] = None
    category_code: Optional[str] = None
    external_product_id: Optional[str] = None
    name: str
    product_url: Optional[str] = None
    description: Optional[str] = None
    primary_fabric: Optional[str] = None
    fabric_composition: Optional[str] = None
    stretch_percentage: float
    intended_fit: str
    available_sizes: List[str]
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
