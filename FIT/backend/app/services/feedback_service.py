"""Service layer for Fit Feedback categorization, performance analytics, and ML training CSV export."""

import csv
import io
from collections import defaultdict
from typing import Dict, List

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundException
from app.models.catalog import Brand, ClothingCategory, Product
from app.models.feedback import FitFeedback
from app.models.measurement import BodyMeasurementProfile
from app.models.recommendation import RecommendationRecord
from app.schemas.feedback import (
    FeedbackAnalyticsResponse,
    FeedbackCreateRequest,
    PerformanceBucket,
)

OVERALL_FIT_TO_CATEGORY: Dict[str, str] = {
    "too_small": "too_tight",
    "slightly_small": "too_tight",
    "perfect": "good_fit",
    "slightly_large": "loose",
    "too_large": "loose",
}


def categorize_fit_feedback(overall_fit: str) -> str:
    """Map granular 5-point user feedback to standardized 3-class ML fit category label."""
    return OVERALL_FIT_TO_CATEGORY.get(overall_fit, "good_fit")


def create_fit_feedback(
    db: Session,
    user_id: int,
    payload: FeedbackCreateRequest,
) -> FitFeedback:
    """Create a FitFeedback record linked to an existing RecommendationRecord."""
    recommendation = db.get(RecommendationRecord, payload.recommendation_id)
    if recommendation is None:
        raise NotFoundException(f"Recommendation with id={payload.recommendation_id} not found.")

    fit_category_label = categorize_fit_feedback(payload.overall_fit)

    feedback = FitFeedback(
        recommendation_id=recommendation.id,
        user_id=user_id,
        actual_size_worn=payload.actual_size_worn.strip().upper(),
        overall_fit=payload.overall_fit,
        fit_category_label=fit_category_label,
        accepted_recommendation=payload.accepted_recommendation,
        chest_bust_note=payload.chest_bust_note,
        shoulder_note=payload.shoulder_note,
        waist_note=payload.waist_note,
        hips_note=payload.hips_note,
        length_note=payload.length_note,
        sleeve_note=payload.sleeve_note,
        comments=payload.comments,
    )
    db.add(feedback)
    db.commit()
    db.refresh(feedback)
    return feedback


def compute_feedback_analytics(db: Session) -> FeedbackAnalyticsResponse:
    """Calculate accuracy and acceptance metrics grouped by brand, category, and model version."""
    total_recommendations = db.scalar(select(func.count(RecommendationRecord.id))) or 0

    stmt = (
        select(
            FitFeedback,
            RecommendationRecord,
            Product,
            Brand,
            ClothingCategory,
        )
        .join(RecommendationRecord, FitFeedback.recommendation_id == RecommendationRecord.id)
        .join(Product, RecommendationRecord.product_id == Product.id)
        .join(Brand, Product.brand_id == Brand.id)
        .join(ClothingCategory, Product.category_id == ClothingCategory.id)
    )
    rows = db.execute(stmt).all()
    total_feedbacks = len(rows)

    distribution: Dict[str, int] = {
        "too_small": 0,
        "slightly_small": 0,
        "perfect": 0,
        "slightly_large": 0,
        "too_large": 0,
    }

    brand_stats: Dict[str, List[int]] = defaultdict(lambda: [0, 0, 0])  # [total, perfect, accepted]
    category_stats: Dict[str, List[int]] = defaultdict(lambda: [0, 0, 0])
    version_stats: Dict[str, List[int]] = defaultdict(lambda: [0, 0, 0])

    total_perfect = 0
    total_accepted = 0

    for fb, rec, prod, brand, category in rows:
        distribution[fb.overall_fit] = distribution.get(fb.overall_fit, 0) + 1
        is_perfect = 1 if fb.overall_fit == "perfect" else 0
        is_accepted = 1 if fb.accepted_recommendation else 0

        total_perfect += is_perfect
        total_accepted += is_accepted

        for bucket_map, key in (
            (brand_stats, brand.name),
            (category_stats, category.code),
            (version_stats, rec.model_version),
        ):
            bucket_map[key][0] += 1
            bucket_map[key][1] += is_perfect
            bucket_map[key][2] += is_accepted

    def build_buckets(stats_map: Dict[str, List[int]]) -> List[PerformanceBucket]:
        result: List[PerformanceBucket] = []
        for k, counts in sorted(stats_map.items()):
            tot, perf, acc = counts
            result.append(
                PerformanceBucket(
                    key=k,
                    total_feedback_count=tot,
                    perfect_fit_count=perf,
                    accepted_count=acc,
                    accuracy_rate=round(perf / tot, 4) if tot else 0.0,
                    acceptance_rate=round(acc / tot, 4) if tot else 0.0,
                )
            )
        return result

    return FeedbackAnalyticsResponse(
        total_recommendations=total_recommendations,
        total_feedbacks=total_feedbacks,
        overall_accuracy_rate=round(total_perfect / total_feedbacks, 4) if total_feedbacks else 0.0,
        overall_acceptance_rate=round(total_accepted / total_feedbacks, 4) if total_feedbacks else 0.0,
        feedback_distribution=distribution,
        by_brand=build_buckets(brand_stats),
        by_category=build_buckets(category_stats),
        by_model_version=build_buckets(version_stats),
    )


def export_labelled_training_csv(db: Session) -> str:
    """
    Generate a clean labelled CSV dataset joining FitFeedback, RecommendationRecord,
    Product, Category, and BodyMeasurementProfile for future ML model training.
    """
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(
        [
            "feedback_id",
            "recommendation_id",
            "brand_name",
            "category_code",
            "product_id",
            "stretch_percentage",
            "fit_preference",
            "chest_bust_cm",
            "underbust_cm",
            "shoulder_cm",
            "sleeve_cm",
            "torso_cm",
            "waist_cm",
            "hips_cm",
            "inseam_cm",
            "thigh_cm",
            "rise_cm",
            "recommended_size",
            "actual_size_worn",
            "overall_fit",
            "fit_category_label",
            "accepted_recommendation",
            "model_version",
            "created_at",
        ]
    )

    stmt = (
        select(
            FitFeedback,
            RecommendationRecord,
            Product,
            Brand,
            ClothingCategory,
            BodyMeasurementProfile,
        )
        .join(RecommendationRecord, FitFeedback.recommendation_id == RecommendationRecord.id)
        .join(Product, RecommendationRecord.product_id == Product.id)
        .join(Brand, Product.brand_id == Brand.id)
        .join(ClothingCategory, Product.category_id == ClothingCategory.id)
        .outerjoin(
            BodyMeasurementProfile,
            RecommendationRecord.measurement_profile_id == BodyMeasurementProfile.id,
        )
        .order_by(FitFeedback.id.asc())
    )

    for fb, rec, prod, brand, cat, profile in db.execute(stmt).all():
        writer.writerow(
            [
                fb.id,
                rec.id,
                brand.name,
                cat.code,
                prod.id,
                prod.stretch_percentage,
                rec.fit_preference_used,
                profile.chest_bust_cm if profile else "",
                profile.underbust_cm if profile else "",
                profile.shoulder_cm if profile else "",
                profile.sleeve_cm if profile else "",
                profile.torso_cm if profile else "",
                profile.waist_cm if profile else "",
                profile.hips_cm if profile else "",
                profile.inseam_cm if profile else "",
                profile.thigh_cm if profile else "",
                profile.rise_cm if profile else "",
                rec.recommended_size,
                fb.actual_size_worn,
                fb.overall_fit,
                fb.fit_category_label,
                fb.accepted_recommendation,
                rec.model_version,
                fb.created_at.isoformat(),
            ]
        )

    return output.getvalue()
