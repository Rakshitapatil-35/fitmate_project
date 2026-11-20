"""Fit feedback router: submit user fit feedback and view accuracy/acceptance metrics."""

from typing import List, Optional

from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_or_guest_user, get_current_user
from app.models.feedback import FitFeedback
from app.models.user import User
from app.schemas.feedback import (
    FeedbackAnalyticsResponse,
    FeedbackCreateRequest,
    FeedbackResponse,
)
from app.services.feedback_service import (
    compute_feedback_analytics,
    create_fit_feedback,
)

router = APIRouter(prefix="/feedback", tags=["Fit Feedback"])


@router.post(
    "",
    response_model=FeedbackResponse,
    status_code=status.HTTP_201_CREATED,
)
async def submit_feedback(
    payload: FeedbackCreateRequest,
    current_user: User = Depends(get_current_or_guest_user),
    db: Session = Depends(get_db),
) -> FitFeedback:
    """Submit fit feedback linked to a previous recommendation."""
    return create_fit_feedback(db=db, user_id=current_user.id, payload=payload)


@router.get("/me", response_model=List[FeedbackResponse])
async def list_my_feedback(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> List[FitFeedback]:
    """List all fit feedback submitted by the current user."""
    stmt = (
        select(FitFeedback)
        .where(FitFeedback.user_id == current_user.id)
        .order_by(FitFeedback.created_at.desc())
    )
    return list(db.scalars(stmt).all())


@router.get("/analytics", response_model=FeedbackAnalyticsResponse)
async def get_feedback_performance_analytics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> FeedbackAnalyticsResponse:
    """Track recommendation performance (accuracy and acceptance rates by brand, category, model version)."""
    return compute_feedback_analytics(db)
