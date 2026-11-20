"""Service orchestrating database lookups, ML/rule recommendation generation, and persistence."""

import json
from typing import Any, Dict, List, Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import AppException, NotFoundException
from app.models.catalog import Brand, ClothingCategory, GarmentMeasurement, Product, SizeChart
from app.models.measurement import BodyMeasurementProfile
from app.models.recommendation import RecommendationRecord
from app.schemas.measurement import MeasurementBaseInput
from app.schemas.recommendation import (
    RankedSizeOption,
    RecommendationExplanation,
    RecommendationResponse,
)
from app.services.ml_client import MLRecommendationClient
from app.services.unit_conversion import LINEAR_MEASUREMENT_FIELDS, normalize_and_validate_measurements


def extract_profile_measurements_cm(profile: BodyMeasurementProfile) -> Dict[str, Optional[float]]:
    """Convert a BodyMeasurementProfile ORM instance into a dictionary of cm/kg measurements."""
    return {
        "chest_bust": profile.chest_bust_cm,
        "underbust": profile.underbust_cm,
        "shoulder": profile.shoulder_cm,
        "sleeve": profile.sleeve_cm,
        "torso": profile.torso_cm,
        "waist": profile.waist_cm,
        "hips": profile.hips_cm,
        "inseam": profile.inseam_cm,
        "thigh": profile.thigh_cm,
        "rise": profile.rise_cm,
        "height": profile.height_cm,
        "weight": profile.weight_kg,
    }


def serialize_garment_rows(garment_measurements: List[GarmentMeasurement]) -> List[Dict[str, Any]]:
    """Convert GarmentMeasurement ORM rows into dictionaries for the recommendation engine."""
    rows: List[Dict[str, Any]] = []
    for gm in garment_measurements:
        rows.append(
            {
                "id": gm.id,
                "size_label": gm.size_label,
                "size_order": gm.size_order,
                "chest_bust_cm": gm.chest_bust_cm,
                "underbust_cm": gm.underbust_cm,
                "shoulder_cm": gm.shoulder_cm,
                "sleeve_cm": gm.sleeve_cm,
                "torso_cm": gm.torso_cm,
                "waist_cm": gm.waist_cm,
                "hips_cm": gm.hips_cm,
                "inseam_cm": gm.inseam_cm,
                "thigh_cm": gm.thigh_cm,
                "rise_cm": gm.rise_cm,
                "stretch_percentage_override": gm.stretch_percentage_override,
            }
        )
    return rows


def resolve_size_chart_for_product(db: Session, product: Product) -> SizeChart:
    """Find the product-specific SizeChart or fall back to the brand+category SizeChart."""
    # 1. Product-specific size chart (prefer verified first)
    product_chart = db.scalar(
        select(SizeChart)
        .where(SizeChart.product_id == product.id)
        .order_by(SizeChart.verification_status.desc(), SizeChart.id.desc())
    )
    if product_chart and product_chart.garment_measurements:
        return product_chart

    # 2. Brand + Category level size chart
    brand_cat_chart = db.scalar(
        select(SizeChart)
        .where(
            SizeChart.brand_id == product.brand_id,
            SizeChart.category_id == product.category_id,
            SizeChart.product_id.is_(None),
        )
        .order_by(SizeChart.verification_status.desc(), SizeChart.id.desc())
    )
    if brand_cat_chart and brand_cat_chart.garment_measurements:
        return brand_cat_chart

    raise NotFoundException(
        f"No size chart with garment measurements found for product '{product.name}' (id={product.id})."
    )


def generate_and_save_recommendation(
    db: Session,
    user_id: Optional[int],
    product_id: int,
    measurement_profile_id: Optional[int] = None,
    inline_measurements: Optional[MeasurementBaseInput] = None,
    fit_preference_override: Optional[str] = None,
    top_n: int = 3,
    use_ml: bool = True,
    ml_client: Optional[MLRecommendationClient] = None,
) -> RecommendationResponse:
    """Resolve user measurements and product size chart, run ML + rule engine, and persist result."""
    product = db.get(Product, product_id)
    if product is None or not product.is_active:
        raise NotFoundException(f"Active product with id={product_id} not found.")

    brand = db.get(Brand, product.brand_id)
    category = db.get(ClothingCategory, product.category_id)
    if brand is None or category is None:
        raise NotFoundException("Product brand or clothing category not found.")

    size_chart = resolve_size_chart_for_product(db, product)

    # Resolve body measurements from profile or inline payload
    profile: Optional[BodyMeasurementProfile] = None
    body_measurements_cm: Dict[str, Optional[float]] = {}
    fit_preference = fit_preference_override or product.intended_fit or "regular"

    if measurement_profile_id is not None:
        profile = db.get(BodyMeasurementProfile, measurement_profile_id)
        if profile is not None and (user_id is None or profile.user_id == user_id):
            body_measurements_cm = extract_profile_measurements_cm(profile)
            if not fit_preference_override:
                fit_preference = profile.fit_preference
        elif inline_measurements is not None:
            profile = None
            raw_dict = {f: getattr(inline_measurements, f) for f in LINEAR_MEASUREMENT_FIELDS}
            body_measurements_cm, weight_kg = normalize_and_validate_measurements(
                raw_measurements=raw_dict,
                unit=inline_measurements.unit,
                weight=inline_measurements.weight,
                weight_unit=inline_measurements.weight_unit,
                gender=inline_measurements.gender,
                target_category=inline_measurements.target_category,
            )
            body_measurements_cm["weight"] = weight_kg
            if not fit_preference_override:
                fit_preference = inline_measurements.fit_preference
        else:
            raise NotFoundException(f"Measurement profile id={measurement_profile_id} not found for user.")
    elif inline_measurements is not None:
        raw_dict = {f: getattr(inline_measurements, f) for f in LINEAR_MEASUREMENT_FIELDS}
        body_measurements_cm, weight_kg = normalize_and_validate_measurements(
            raw_measurements=raw_dict,
            unit=inline_measurements.unit,
            weight=inline_measurements.weight,
            weight_unit=inline_measurements.weight_unit,
            gender=inline_measurements.gender,
            target_category=inline_measurements.target_category,
        )
        body_measurements_cm["weight"] = weight_kg
        if not fit_preference_override:
            fit_preference = inline_measurements.fit_preference
    elif user_id is not None:
        # Automatically pick user's default or latest profile
        profile = db.scalar(
            select(BodyMeasurementProfile)
            .where(BodyMeasurementProfile.user_id == user_id)
            .order_by(BodyMeasurementProfile.is_default.desc(), BodyMeasurementProfile.updated_at.desc())
        )
        if profile is None:
            raise AppException(
                message="No saved body measurement profile found. Please save measurements or provide inline_measurements.",
                status_code=400,
                error_code="MISSING_MEASUREMENT_PROFILE",
            )
        body_measurements_cm = extract_profile_measurements_cm(profile)
        if not fit_preference_override:
            fit_preference = profile.fit_preference
    else:
        raise AppException(
            message="Provide either measurement_profile_id or inline_measurements.",
            status_code=400,
            error_code="MISSING_MEASUREMENTS",
        )

    garment_rows = serialize_garment_rows(size_chart.garment_measurements)
    if product.available_sizes:
        allowed_set = set(product.available_sizes)
        filtered = [r for r in garment_rows if r["size_label"] in allowed_set]
        if filtered:
            garment_rows = filtered

    client = ml_client or MLRecommendationClient()
    ranked_sizes, explanation, meta, pred_log = client.recommend_with_fallback(
        db=db,
        category_code=category.code,
        body_measurements=body_measurements_cm,
        garment_rows=garment_rows,
        allowed_sizes=product.available_sizes,
        fit_preference=fit_preference,
        product_stretch_pct=product.stretch_percentage,
        verification_status=size_chart.verification_status,
        top_n=top_n,
        use_ml=use_ml,
        user_id=user_id,
        product_id=product.id,
        brand_name=brand.name,
    )

    rec_record = RecommendationRecord(
        user_id=user_id,
        measurement_profile_id=profile.id if profile else None,
        product_id=product.id,
        size_chart_id=size_chart.id,
        recommended_size=meta["recommended_size"],
        fit_category=meta["fit_category"],
        score=meta["score"],
        confidence=meta["confidence"],
        fit_preference_used=fit_preference,
        strategy_used=explanation.strategy_name,
        method_used=meta["method_used"],
        fallback_used=meta["fallback_used"],
        model_version=meta["model_version"],
        ranked_sizes_json=json.dumps([opt.model_dump() for opt in ranked_sizes]),
        explanation_json=json.dumps(explanation.model_dump()),
    )
    db.add(rec_record)
    db.flush()

    pred_log.recommendation_id = rec_record.id
    db.commit()
    db.refresh(rec_record)

    return RecommendationResponse(
        recommendation_id=rec_record.id,
        product_id=product.id,
        product_name=product.name,
        brand_name=brand.name,
        category_code=category.code,
        size_chart_id=size_chart.id,
        size_chart_verification_status=size_chart.verification_status,
        recommended_size=rec_record.recommended_size,
        fit_category=rec_record.fit_category,  # type: ignore[arg-type]
        score=rec_record.score,
        confidence=rec_record.confidence,
        fit_preference_used=rec_record.fit_preference_used,
        strategy_used=rec_record.strategy_used,
        method_used=rec_record.method_used,
        fallback_used=rec_record.fallback_used,
        model_version=rec_record.model_version,
        ranked_sizes=ranked_sizes,
        explanation=explanation,
        created_at=rec_record.created_at,
    )


def reconstruct_recommendation_response(
    db: Session,
    rec_record: RecommendationRecord,
) -> RecommendationResponse:
    """Rehydrate a RecommendationResponse from a stored RecommendationRecord."""
    product = db.get(Product, rec_record.product_id)
    brand = db.get(Brand, product.brand_id) if product else None
    category = db.get(ClothingCategory, product.category_id) if product else None
    size_chart = db.get(SizeChart, rec_record.size_chart_id)

    ranked_raw = json.loads(rec_record.ranked_sizes_json)
    explanation_raw = json.loads(rec_record.explanation_json)

    return RecommendationResponse(
        recommendation_id=rec_record.id,
        product_id=rec_record.product_id,
        product_name=product.name if product else "Unknown Product",
        brand_name=brand.name if brand else "Unknown Brand",
        category_code=category.code if category else "mens_tops",
        size_chart_id=rec_record.size_chart_id,
        size_chart_verification_status=size_chart.verification_status if size_chart else "estimated",
        recommended_size=rec_record.recommended_size,
        fit_category=rec_record.fit_category,  # type: ignore[arg-type]
        score=rec_record.score,
        confidence=rec_record.confidence,
        fit_preference_used=rec_record.fit_preference_used,
        strategy_used=rec_record.strategy_used,
        method_used=rec_record.method_used,
        fallback_used=rec_record.fallback_used,
        model_version=rec_record.model_version,
        ranked_sizes=[RankedSizeOption(**item) for item in ranked_raw],
        explanation=RecommendationExplanation(**explanation_raw),
        created_at=rec_record.created_at,
    )
