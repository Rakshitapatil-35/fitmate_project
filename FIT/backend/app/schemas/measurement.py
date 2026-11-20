"""Pydantic v2 schemas for user body measurements and unit conversion."""

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.common import (
    CategoryCodeLiteral,
    FitPreferenceLiteral,
    GenderLiteral,
    UnitLiteral,
    WeightUnitLiteral,
)


class MeasurementBaseInput(BaseModel):
    """Body measurement input accepting either centimetres ('cm') or inches ('in')."""

    profile_name: str = Field(default="Default Profile", min_length=1, max_length=120)
    gender: GenderLiteral = Field(default="unisex")
    fit_preference: FitPreferenceLiteral = Field(default="regular")
    unit: UnitLiteral = Field(default="cm", description="Input unit for linear dimensions ('cm' or 'in')")
    weight_unit: WeightUnitLiteral = Field(default="kg", description="Input unit for weight ('kg' or 'lbs')")
    target_category: Optional[CategoryCodeLiteral] = Field(
        default=None,
        description="Optional category to enforce category-specific required measurements",
    )
    is_default: bool = Field(default=False)

    chest_bust: Optional[float] = Field(default=None, gt=0)
    underbust: Optional[float] = Field(default=None, gt=0)
    shoulder: Optional[float] = Field(default=None, gt=0)
    sleeve: Optional[float] = Field(default=None, gt=0)
    torso: Optional[float] = Field(default=None, gt=0)
    waist: Optional[float] = Field(default=None, gt=0)
    hips: Optional[float] = Field(default=None, gt=0)
    inseam: Optional[float] = Field(default=None, gt=0)
    thigh: Optional[float] = Field(default=None, gt=0)
    rise: Optional[float] = Field(default=None, gt=0)
    height: Optional[float] = Field(default=None, gt=0)
    weight: Optional[float] = Field(default=None, gt=0)
    body_shape: Optional[str] = Field(default=None, max_length=120)
    fit_style: Optional[str] = Field(default=None, max_length=64)


class MeasurementCreateRequest(MeasurementBaseInput):
    """Request schema for creating a body measurement profile."""


class MeasurementUpdateRequest(BaseModel):
    """Request schema for updating an existing body measurement profile."""

    profile_name: Optional[str] = Field(default=None, min_length=1, max_length=120)
    gender: Optional[GenderLiteral] = None
    fit_preference: Optional[FitPreferenceLiteral] = None
    unit: UnitLiteral = Field(default="cm")
    weight_unit: WeightUnitLiteral = Field(default="kg")
    target_category: Optional[CategoryCodeLiteral] = None
    fit_style: Optional[str] = Field(default=None, max_length=64)
    is_default: Optional[bool] = None

    chest_bust: Optional[float] = Field(default=None, gt=0)
    underbust: Optional[float] = Field(default=None, gt=0)
    shoulder: Optional[float] = Field(default=None, gt=0)
    sleeve: Optional[float] = Field(default=None, gt=0)
    torso: Optional[float] = Field(default=None, gt=0)
    waist: Optional[float] = Field(default=None, gt=0)
    hips: Optional[float] = Field(default=None, gt=0)
    inseam: Optional[float] = Field(default=None, gt=0)
    thigh: Optional[float] = Field(default=None, gt=0)
    rise: Optional[float] = Field(default=None, gt=0)
    height: Optional[float] = Field(default=None, gt=0)
    weight: Optional[float] = Field(default=None, gt=0)
    body_shape: Optional[str] = Field(default=None, max_length=120)
    clear_optional_fields: Optional[List[str]] = Field(
        default=None,
        description="Optional list of measurement field names (e.g. ['shoulder', 'inseam']) to clear to None",
    )


class MeasurementProfileResponse(BaseModel):
    """Stored body measurement profile (all linear dimensions in cm, weight in kg)."""

    id: int
    user_id: int
    profile_name: str
    gender: str
    fit_preference: str
    original_unit: str
    is_default: bool

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
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
    body_shape: Optional[str] = None
    target_category: Optional[str] = None
    fit_style: Optional[str] = None
    history: List[Dict[str, Any]] = []

    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UnitConversionRequest(BaseModel):
    """Utility endpoint payload for standalone inch/cm conversion."""

    value: float = Field(..., gt=0)
    from_unit: UnitLiteral = "in"
    to_unit: UnitLiteral = "cm"


class UnitConversionResponse(BaseModel):
    """Result of unit conversion."""

    original_value: float
    from_unit: str
    converted_value: float
    to_unit: str
