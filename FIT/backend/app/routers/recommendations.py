"""Size recommendations router: compute recommendations and view recommendation history."""

from typing import List, Optional

from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundException
from app.database import get_db
from app.dependencies import get_current_or_guest_user, get_optional_current_user
from app.models.recommendation import RecommendationRecord
from app.models.user import User
from app.schemas.recommendation import RecommendationRequest, RecommendationResponse
from app.services.catalog_styles import FIT_STYLE_TO_PREFERENCE
from app.services.recommendation_service import (
    generate_and_save_recommendation,
    reconstruct_recommendation_response,
)

router = APIRouter(prefix="/recommendations", tags=["Size Recommendations"])


@router.post(
    "",
    response_model=RecommendationResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_recommendation(
    payload: RecommendationRequest,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
) -> RecommendationResponse:
    """
    Generate a ranked size recommendation with per-measurement ease notes and ML hybrid scoring
    (with automatic rule-based fallback if ML is unavailable or low-confidence).
    """
    user_id = current_user.id if current_user else None
    fit_override = payload.fit_preference_override
    if not fit_override and payload.fit_style:
        fit_override = FIT_STYLE_TO_PREFERENCE.get(payload.fit_style.strip().lower(), "regular")  # type: ignore[assignment]

    return generate_and_save_recommendation(
        db=db,
        user_id=user_id,
        product_id=payload.product_id,
        measurement_profile_id=payload.measurement_profile_id,
        inline_measurements=payload.inline_measurements,
        fit_preference_override=fit_override,
        top_n=payload.top_n,
        use_ml=payload.use_ml,
    )


@router.get("", response_model=List[RecommendationResponse])
async def list_my_recommendations(
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
) -> List[RecommendationResponse]:
    """List past size recommendations generated for the current user (or guest session)."""
    if current_user is not None:
        stmt = (
            select(RecommendationRecord)
            .where(RecommendationRecord.user_id == current_user.id)
            .order_by(RecommendationRecord.created_at.desc())
        )
    else:
        stmt = (
            select(RecommendationRecord)
            .order_by(RecommendationRecord.created_at.desc())
            .limit(20)
        )
    records = db.scalars(stmt).all()
    return [reconstruct_recommendation_response(db, rec) for rec in records]


@router.get("/{recommendation_id}", response_model=RecommendationResponse)
async def get_recommendation_by_id(
    recommendation_id: int,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
) -> RecommendationResponse:
    """Retrieve a specific size recommendation record."""
    rec = db.get(RecommendationRecord, recommendation_id)
    if rec is None:
        raise NotFoundException(f"Recommendation with id={recommendation_id} not found.")
    if current_user is not None and rec.user_id is not None and rec.user_id != current_user.id and current_user.role != "admin":
        raise NotFoundException(f"Recommendation with id={recommendation_id} not found.")
    return reconstruct_recommendation_response(db, rec)


@router.delete("/{recommendation_id}")
async def delete_recommendation_by_id(
    recommendation_id: int,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """Delete a specific size recommendation record from history."""
    rec = db.get(RecommendationRecord, recommendation_id)
    if rec is None:
        raise NotFoundException(f"Recommendation with id={recommendation_id} not found.")
    if current_user is not None and rec.user_id is not None and rec.user_id != current_user.id and current_user.role != "admin":
        raise NotFoundException(f"Recommendation with id={recommendation_id} not found.")
    db.delete(rec)
    db.commit()
    return {"success": True, "message": f"Recommendation {recommendation_id} deleted successfully."}
