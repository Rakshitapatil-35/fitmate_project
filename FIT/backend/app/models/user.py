"""SQLAlchemy 2.0 ORM models for Users and JWT Token Blacklist."""

from datetime import datetime, timezone
from typing import TYPE_CHECKING, List

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.feedback import FitFeedback
    from app.models.measurement import BodyMeasurementProfile
    from app.models.recommendation import RecommendationRecord


def utc_now() -> datetime:
    """Return current UTC timestamp."""
    return datetime.now(timezone.utc)


class User(Base):
    """Application user account supporting standard user and admin roles."""

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(32), default="user", nullable=False, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        onupdate=utc_now,
        nullable=False,
    )

    measurement_profiles: Mapped[List["BodyMeasurementProfile"]] = relationship(
        "BodyMeasurementProfile",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    recommendations: Mapped[List["RecommendationRecord"]] = relationship(
        "RecommendationRecord",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    feedbacks: Mapped[List["FitFeedback"]] = relationship(
        "FitFeedback",
        back_populates="user",
        cascade="all, delete-orphan",
    )


class TokenBlacklist(Base):
    """Revoked JWT tokens (access or refresh) for logout and session invalidation."""

    __tablename__ = "token_blacklist"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    jti: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    token_type: Mapped[str] = mapped_column(String(32), nullable=False)
    user_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    revoked_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
