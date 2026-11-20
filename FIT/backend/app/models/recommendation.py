"""SQLAlchemy 2.0 ORM models for Size Recommendations and ML Prediction Logs."""

from datetime import datetime, timezone
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.catalog import Product
    from app.models.feedback import FitFeedback
    from app.models.measurement import BodyMeasurementProfile
    from app.models.user import User


def utc_now() -> datetime:
    """Return current UTC timestamp."""
    return datetime.now(timezone.utc)


class RecommendationRecord(Base):
    """Persisted size recommendation generated for a user and product."""

    __tablename__ = "recommendations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    measurement_profile_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("body_measurement_profiles.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    product_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("products.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    size_chart_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("size_charts.id", ondelete="CASCADE"),
        nullable=False,
    )
    recommended_size: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    fit_category: Mapped[str] = mapped_column(String(32), nullable=False)
    score: Mapped[float] = mapped_column(Float, nullable=False)
    confidence: Mapped[float] = mapped_column(Float, nullable=False)
    fit_preference_used: Mapped[str] = mapped_column(String(32), nullable=False)
    strategy_used: Mapped[str] = mapped_column(String(64), nullable=False)
    method_used: Mapped[str] = mapped_column(String(64), nullable=False)
    fallback_used: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    model_version: Mapped[str] = mapped_column(String(64), nullable=False)
    ranked_sizes_json: Mapped[str] = mapped_column(Text, nullable=False)
    explanation_json: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)

    user: Mapped[Optional["User"]] = relationship("User", back_populates="recommendations")
    measurement_profile: Mapped[Optional["BodyMeasurementProfile"]] = relationship(
        "BodyMeasurementProfile",
        back_populates="recommendations",
    )
    product: Mapped["Product"] = relationship("Product", back_populates="recommendations")
    feedbacks: Mapped[List["FitFeedback"]] = relationship(
        "FitFeedback",
        back_populates="recommendation",
        cascade="all, delete-orphan",
    )


class PredictionLog(Base):
    """Audit log of ML inference calls, latency, model version, and fallback invocations."""

    __tablename__ = "prediction_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    recommendation_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("recommendations.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    user_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    product_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("products.id", ondelete="SET NULL"),
        nullable=True,
    )
    model_version: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    input_payload_json: Mapped[str] = mapped_column(Text, nullable=False)
    output_payload_json: Mapped[str] = mapped_column(Text, nullable=False)
    predicted_size: Mapped[str] = mapped_column(String(32), nullable=False)
    fit_category: Mapped[str] = mapped_column(String(32), nullable=False)
    confidence: Mapped[float] = mapped_column(Float, nullable=False)
    latency_ms: Mapped[float] = mapped_column(Float, nullable=False)
    fallback_used: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    fallback_reason: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
