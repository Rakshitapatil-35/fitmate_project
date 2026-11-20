"""Pydantic v2 schemas for Fit Feedback and Recommendation Performance Analytics."""

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.schemas.common import OverallFitFeedbackLiteral


class FeedbackCreateRequest(BaseModel):
    """User feedback submission connected to an original recommendation."""

    recommendation_id: int = Field(..., gt=0)
    actual_size_worn: Optional[str] = Field(default=None, max_length=32)
    purchased_size: Optional[str] = Field(default=None, max_length=32)
    overall_fit: Optional[str] = Field(default=None)
    fit_label: Optional[str] = Field(default=None)
    accepted_recommendation: bool = Field(
        default=True,
        description="Whether the user wore/kept the recommended size",
    )
    chest_bust_note: Optional[str] = Field(default=None, max_length=120)
    shoulder_note: Optional[str] = Field(default=None, max_length=120)
    waist_note: Optional[str] = Field(default=None, max_length=120)
    hips_note: Optional[str] = Field(default=None, max_length=120)
    length_note: Optional[str] = Field(default=None, max_length=120)
    sleeve_note: Optional[str] = Field(default=None, max_length=120)
    comments: Optional[str] = Field(default=None, max_length=1000)

    @model_validator(mode="before")
    @classmethod
    def normalize_aliases(cls, data: Any) -> Any:
        if isinstance(data, dict):
            # Map purchased_size to actual_size_worn if missing
            if not data.get("actual_size_worn") and data.get("purchased_size"):
                data["actual_size_worn"] = str(data["purchased_size"])
            elif not data.get("actual_size_worn"):
                data["actual_size_worn"] = "M"

            # Map fit_label to overall_fit if missing
            if not data.get("overall_fit") and data.get("fit_label"):
                lbl = str(data["fit_label"]).strip().lower()
                if "tight" in lbl or "small" in lbl:
                    data["overall_fit"] = "too_small"
                elif "loose" in lbl or "large" in lbl:
                    data["overall_fit"] = "too_large"
                else:
                    data["overall_fit"] = "perfect"
            elif not data.get("overall_fit"):
                data["overall_fit"] = "perfect"
            else:
                # Normalize if non-standard string passed
                raw_fit = str(data["overall_fit"]).strip().lower()
                if raw_fit in ["just_right", "good", "good_fit", "fit"]:
                    data["overall_fit"] = "perfect"
                elif raw_fit in ["tight", "too_tight"]:
                    data["overall_fit"] = "too_small"
                elif raw_fit in ["loose", "too_loose"]:
                    data["overall_fit"] = "too_large"
        return data


class FeedbackResponse(BaseModel):
    """Saved fit feedback record."""

    id: int
    recommendation_id: int
    user_id: int
    actual_size_worn: str
    overall_fit: str
    fit_category_label: str
    accepted_recommendation: bool
    chest_bust_note: Optional[str] = None
    shoulder_note: Optional[str] = None
    waist_note: Optional[str] = None
    hips_note: Optional[str] = None
    length_note: Optional[str] = None
    sleeve_note: Optional[str] = None
    comments: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PerformanceBucket(BaseModel):
    """Aggregated accuracy and acceptance metrics for a slice (brand, category, model version)."""

    key: str
    total_feedback_count: int
    perfect_fit_count: int
    accepted_count: int
    accuracy_rate: float
    acceptance_rate: float


class FeedbackAnalyticsResponse(BaseModel):
    """Comprehensive performance report across brands, categories, and ML model versions."""

    total_recommendations: int
    total_feedbacks: int
    overall_accuracy_rate: float
    overall_acceptance_rate: float
    feedback_distribution: Dict[str, int]
    by_brand: List[PerformanceBucket]
    by_category: List[PerformanceBucket]
    by_model_version: List[PerformanceBucket]
