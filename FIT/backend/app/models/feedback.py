"""SQLAlchemy 2.0 ORM model for Post-Purchase / Try-On Fit Feedback."""

from datetime import datetime, timezone
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.recommendation import RecommendationRecord
    from app.models.user import User


def utc_now() -> datetime:
    """Return current UTC timestamp."""
    return datetime.now(timezone.utc)


class FitFeedback(Base):
    """User fit feedback tied to an original size recommendation."""

    __tablename__ = "fit_feedbacks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    recommendation_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("recommendations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    actual_size_worn: Mapped[str] = mapped_column(String(32), nullable=False)
    overall_fit: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    fit_category_label: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    accepted_recommendation: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Optional per-area notes (e.g., tight, good, loose, or text note)
    chest_bust_note: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    shoulder_note: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    waist_note: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    hips_note: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    length_note: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    sleeve_note: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    comments: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)

    recommendation: Mapped["RecommendationRecord"] = relationship(
        "RecommendationRecord",
        back_populates="feedbacks",
    )
    user: Mapped["User"] = relationship("User", back_populates="feedbacks")
