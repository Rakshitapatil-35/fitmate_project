"""SQLAlchemy 2.0 ORM model for user body measurement profiles."""

from datetime import datetime, timezone
import json
from typing import TYPE_CHECKING, Any, Dict, List, Optional

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.recommendation import RecommendationRecord
    from app.models.user import User


def utc_now() -> datetime:
    """Return current UTC timestamp."""
    return datetime.now(timezone.utc)


class BodyMeasurementProfile(Base):
    """Stores a user's body measurements normalized in centimetres (and kg for weight)."""

    __tablename__ = "body_measurement_profiles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    profile_name: Mapped[str] = mapped_column(String(120), nullable=False, default="Default Profile")
    gender: Mapped[str] = mapped_column(String(32), nullable=False, default="unisex")
    fit_preference: Mapped[str] = mapped_column(String(32), nullable=False, default="regular")
    original_unit: Mapped[str] = mapped_column(String(10), nullable=False, default="cm")
    is_default: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # All linear measurements stored in centimetres (cm)
    chest_bust_cm: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    underbust_cm: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    shoulder_cm: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    sleeve_cm: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    torso_cm: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    waist_cm: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    hips_cm: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    inseam_cm: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    thigh_cm: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    rise_cm: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    height_cm: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    weight_kg: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    body_shape: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    target_category: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    fit_style: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    history_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True, default="[]")

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        onupdate=utc_now,
        nullable=False,
    )

    user: Mapped["User"] = relationship("User", back_populates="measurement_profiles")
    recommendations: Mapped[List["RecommendationRecord"]] = relationship(
        "RecommendationRecord",
        back_populates="measurement_profile",
    )

    @property
    def history(self) -> List[Dict[str, Any]]:
        """Return parsed list of historical measurement edits."""
        if not self.history_json:
            return []
        try:
            data = json.loads(self.history_json)
            return data if isinstance(data, list) else []
        except Exception:
            return []
