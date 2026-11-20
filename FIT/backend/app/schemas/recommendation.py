"""Pydantic v2 schemas for Size Recommendation requests, explanations, and ranked outputs."""

from datetime import datetime
from typing import Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.common import FitCategoryLiteral, FitPreferenceLiteral, UnitLiteral
from app.schemas.measurement import MeasurementBaseInput


class InlineBodyMeasurements(MeasurementBaseInput):
    """Inline body measurements when a user does not reference a saved profile."""


class RecommendationRequest(BaseModel):
    """Request payload for generating a size recommendation for a product."""

    product_id: int = Field(..., gt=0)
    measurement_profile_id: Optional[int] = Field(
        default=None,
        gt=0,
        description="ID of a saved measurement profile for the authenticated user",
    )
    inline_measurements: Optional[InlineBodyMeasurements] = Field(
        default=None,
        description="Optional inline measurements if not using a saved profile",
    )
    fit_preference_override: Optional[FitPreferenceLiteral] = Field(
        default=None,
        description="Override fit preference (slim, regular, relaxed) for this recommendation",
    )
    fit_style: Optional[str] = Field(
        default=None,
        max_length=64,
        description="Garment fit style (e.g. Baggy, Loose, Straight, Slim, Oversized, Bodycon, A-line)",
    )
    top_n: int = Field(default=3, ge=1, le=10, description="Number of top ranked sizes to return")
    use_ml: bool = Field(default=True, description="Whether to consult the ML predictor before/with rule engine")


class PerMeasurementFitNote(BaseModel):
    """Detailed fit breakdown for a single body vs. garment measurement."""

    measurement: str
    body_cm: float
    garment_cm: float
    effective_garment_cm: float
    ease_cm: float
    target_ease_min_cm: float
    target_ease_ideal_cm: float
    target_ease_max_cm: float
    weight: float
    dimension_score: float
    fit_status: str
    note: str


class RankedSizeOption(BaseModel):
    """A single candidate size ranked by the recommendation engine."""

    size_label: str
    score: float = Field(..., ge=0.0, le=100.0)
    fit_category: FitCategoryLiteral
    confidence: float = Field(..., ge=0.0, le=1.0)
    summary_note: str
    measurement_notes: List[PerMeasurementFitNote]


class RecommendationExplanation(BaseModel):
    """Full structured explanation of how the size recommendation was computed."""

    category_code: str
    strategy_name: str
    fit_preference: str
    fabric_stretch_pct: float
    evaluated_measurements: List[str]
    missing_measurements: List[str]
    confidence_penalty_reason: Optional[str] = None
    ml_prediction: Optional[Dict[str, object]] = None
    overall_summary: str
    per_measurement_notes: List[PerMeasurementFitNote]


class RecommendationResponse(BaseModel):
    """Complete size recommendation API response."""

    recommendation_id: int
    product_id: int
    product_name: str
    brand_name: str
    category_code: str
    size_chart_id: int
    size_chart_verification_status: str
    recommended_size: str
    fit_category: FitCategoryLiteral
    score: float
    confidence: float
    fit_preference_used: str
    strategy_used: str
    method_used: str
    fallback_used: bool
    model_version: str
    ranked_sizes: List[RankedSizeOption]
    explanation: RecommendationExplanation
    created_at: datetime


class PredictionLogResponse(BaseModel):
    """Audit log entry for ML predictions."""

    id: int
    recommendation_id: Optional[int] = None
    user_id: Optional[int] = None
    product_id: Optional[int] = None
    model_version: str
    predicted_size: str
    fit_category: str
    confidence: float
    latency_ms: float
    fallback_used: bool
    fallback_reason: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
