"""Router for multi-brand sizing comparisons, fit-style evaluation, and live 5-model inference across all brands."""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_optional_current_user
from app.models.catalog import Brand, ClothingCategory, Product, SizeChart
from app.models.measurement import BodyMeasurementProfile
from app.models.user import User
from app.services.catalog_styles import (
    FIT_STYLE_CATALOG,
    FIT_STYLE_TO_PREFERENCE,
    STYLE_PARAMETERS,
    validate_fit_style_for_category,
)
from app.services.model_service import default_model_service
from app.services.recommendation_engine import RecommendationEngine
from app.services.recommendation_service import serialize_garment_rows
from src.utils import parse_circumference_to_cm, parse_height_to_cm

router = APIRouter(prefix="/comparison", tags=["Size & Brand Comparison"])

# Brand-specific grading offsets (in cm) relative to baseline international sizing,
# reflecting how each label cuts its patterns (e.g. Mango/Zara slimmer vs Uniqlo/H&M roomier).
BRAND_GRADING_PROFILE: Dict[str, Dict[str, Any]] = {
    "zara": {
        "offset_cm": -1.5,
        "stretch_pct": 2.0,
        "cut_summary": "Runs slightly narrow in shoulders & chest (-1.5 cm); consider sizing up if between sizes",
    },
    "hm": {
        "offset_cm": 2.5,
        "stretch_pct": 2.0,
        "cut_summary": "Standard relaxed EU cut with +2.5 cm extra comfort ease",
    },
    "h&m": {
        "offset_cm": 2.5,
        "stretch_pct": 2.0,
        "cut_summary": "Standard relaxed EU cut with +2.5 cm extra comfort ease",
    },
    "levis": {
        "offset_cm": 0.5,
        "stretch_pct": 1.5,
        "cut_summary": "Heritage structured denim/twill cut; true to standard sizing",
    },
    "levi's": {
        "offset_cm": 0.5,
        "stretch_pct": 1.5,
        "cut_summary": "Heritage structured denim/twill cut; true to standard sizing",
    },
    "uniqlo": {
        "offset_cm": 3.5,
        "stretch_pct": 4.0,
        "cut_summary": "Generous comfort drape (+3.5 cm ease); size down for a closer silhouette",
    },
    "mango": {
        "offset_cm": -3.0,
        "stretch_pct": 2.0,
        "cut_summary": "Tailored slim Mediterranean cut (-3.0 cm); runs small, consider sizing up",
    },
    "nordic-thread": {
        "offset_cm": 1.0,
        "stretch_pct": 2.5,
        "cut_summary": "Scandinavian architectural cut with clean +1.0 cm natural drape",
    },
    "aura-atelier": {
        "offset_cm": -0.5,
        "stretch_pct": 6.0,
        "cut_summary": "Contoured stretch-knit tailoring with high recovery elasticity",
    },
}


class MultiBrandComparisonRequest(BaseModel):
    """Payload for evaluating a user's measurements and chosen fit style across all seeded brands."""

    gender: str = Field(default="female", description="'female' or 'male'")
    category: str = Field(default="womens_tops", description="Category code or group (tops, bottoms, dresses)")
    fit_style: str = Field(default="Regular", description="Chosen fit style e.g. Baggy, Slim, Oversized, Bodycon")
    unit: str = Field(default="cm", description="'cm' or 'in'")
    measurement_profile_id: Optional[int] = Field(default=None)
    chest_bust: Optional[float] = Field(default=None)
    waist: Optional[float] = Field(default=None)
    hips: Optional[float] = Field(default=None)
    height: Optional[float] = Field(default=None)
    weight: Optional[float] = Field(default=None)
    shoulder: Optional[float] = Field(default=None)
    inseam: Optional[float] = Field(default=None)


def _resolve_canonical_category_code(gender: str, category: str) -> str:
    cat_low = (category or "womens_tops").strip().lower()
    is_male = (gender or "female").strip().lower() in ("male", "men", "man")
    if cat_low in ("mens_tops", "womens_tops", "mens_bottoms", "womens_bottoms", "womens_dresses"):
        if is_male and cat_low == "womens_tops":
            return "mens_tops"
        if is_male and cat_low == "womens_bottoms":
            return "mens_bottoms"
        return cat_low
    if "dress" in cat_low:
        return "womens_dresses"
    if "bottom" in cat_low or "jean" in cat_low or "pant" in cat_low or "trouser" in cat_low:
        return "mens_bottoms" if is_male else "womens_bottoms"
    return "mens_tops" if is_male else "womens_tops"


def _build_brand_garment_rows(
    db: Session,
    brand: Brand,
    category_code: str,
    offset_cm: float,
) -> tuple[List[Dict[str, Any]], Optional[Product], float]:
    """Fetch verified size chart rows for a brand+category or derive graded rows from base chart + brand offset."""
    cat_obj = db.scalar(select(ClothingCategory).where(ClothingCategory.code == category_code))
    product: Optional[Product] = None
    if cat_obj:
        product = db.scalar(
            select(Product)
            .where(Product.brand_id == brand.id, Product.category_id == cat_obj.id, Product.is_active.is_(True))
            .order_by(Product.id.asc())
        )
        chart = db.scalar(
            select(SizeChart)
            .where(SizeChart.brand_id == brand.id, SizeChart.category_id == cat_obj.id)
            .order_by(SizeChart.verification_status.desc(), SizeChart.id.desc())
        )
        if chart and chart.garment_measurements:
            return serialize_garment_rows(chart.garment_measurements), product, (product.stretch_percentage if product else 2.0)

    # Fallback: take category reference chart from DB and apply the brand's empirical grading offset_cm
    if cat_obj:
        ref_chart = db.scalar(
            select(SizeChart)
            .where(SizeChart.category_id == cat_obj.id)
            .order_by(SizeChart.verification_status.desc(), SizeChart.id.asc())
        )
        if ref_chart and ref_chart.garment_measurements:
            base_rows = serialize_garment_rows(ref_chart.garment_measurements)
            graded_rows: List[Dict[str, Any]] = []
            for r in base_rows:
                nr = dict(r)
                for dim in ("chest_bust_cm", "underbust_cm", "waist_cm", "hips_cm", "thigh_cm"):
                    if nr.get(dim) is not None:
                        nr[dim] = round(float(nr[dim]) + offset_cm, 1)
                if nr.get("shoulder_cm") is not None:
                    nr["shoulder_cm"] = round(float(nr["shoulder_cm"]) + offset_cm * 0.35, 1)
                graded_rows.append(nr)
            return graded_rows, product, BRAND_GRADING_PROFILE.get(brand.slug.lower(), {}).get("stretch_pct", 2.0)

    # Standard graded fallback table if category has no chart yet
    base_template = [
        ("XS", 1, 83.0, 65.0, 90.0, 37.5, 58.0, 74.5, 67.0),
        ("S", 2, 88.0, 70.0, 95.0, 39.0, 59.0, 75.0, 68.5),
        ("M", 3, 94.0, 76.0, 101.0, 40.5, 60.0, 75.5, 70.0),
        ("L", 4, 101.0, 83.0, 108.0, 42.0, 61.0, 76.0, 72.0),
        ("XL", 5, 108.0, 90.0, 115.0, 43.5, 62.0, 76.5, 74.0),
        ("XXL", 6, 116.0, 98.0, 123.0, 45.0, 63.0, 77.0, 76.0),
    ]
    rows = []
    for lbl, order, chest, waist, hips, shoulder, sleeve, inseam, torso in base_template:
        rows.append(
            {
                "size_label": lbl,
                "size_order": order,
                "chest_bust_cm": round(chest + offset_cm, 1),
                "waist_cm": round(waist + offset_cm, 1),
                "hips_cm": round(hips + offset_cm, 1),
                "shoulder_cm": round(shoulder + offset_cm * 0.35, 1),
                "sleeve_cm": sleeve,
                "inseam_cm": inseam,
                "torso_cm": torso,
            }
        )
    return rows, product, 2.0


def evaluate_brands_for_measurements(
    db: Session,
    gender: str,
    category: str,
    fit_style: str,
    body_cm: Dict[str, Optional[float]],
    weight_kg: float = 62.0,
) -> List[Dict[str, Any]]:
    """Run RecommendationEngine + all 5 ML models across every active brand in the database."""
    category_code = _resolve_canonical_category_code(gender, category)
    style_clean = validate_fit_style_for_category(category_code, fit_style)
    style_low = style_clean.lower()
    style_params = STYLE_PARAMETERS.get(style_low, {"fit_preference": "regular", "ease_offset_cm": 0.0, "stretch_bonus_pct": 0.0})
    fit_pref = style_params["fit_preference"]
    style_extra_offset = float(style_params["ease_offset_cm"])
    style_stretch_bonus = float(style_params["stretch_bonus_pct"])

    engine = RecommendationEngine()
    brands = db.scalars(select(Brand).where(Brand.is_active.is_(True)).order_by(Brand.id.asc())).all()
    results: List[Dict[str, Any]] = []

    ml_cat = "dress" if "dress" in category_code else ("bottoms" if "bottom" in category_code else "top")
    height_val = body_cm.get("height") or (178.0 if "men" in category_code else 168.0)
    waist_val = body_cm.get("waist") or (84.0 if "men" in category_code else 74.0)
    hips_val = body_cm.get("hips") or (99.0 if "men" in category_code else 98.0)
    chest_val = body_cm.get("chest_bust") or (98.0 if "men" in category_code else 92.0)

    # Pre-compute user-level Model 4 (Body Shape) once
    body_shape_info: Dict[str, Any] = {}
    try:
        body_shape_info = default_model_service.predict_body_shape(
            gender="male" if "men" in category_code else "female",
            height_cm=float(height_val),
            weight_kg=float(weight_kg),
            waist_cm=float(waist_val),
        )
    except Exception:
        pass

    size_to_num = {"XXS": 0.0, "XS": 2.0, "S": 4.0, "M": 8.0, "L": 12.0, "XL": 16.0, "XXL": 20.0, "XXXL": 24.0}

    for b in brands:
        b_slug = b.slug.lower()
        grading = BRAND_GRADING_PROFILE.get(
            b_slug,
            {
                "offset_cm": 0.0,
                "stretch_pct": 2.0,
                "cut_summary": f"True to {b.name} verified pattern specifications",
            },
        )
        total_offset = float(grading["offset_cm"]) + style_extra_offset
        garment_rows, matched_product, stretch_pct = _build_brand_garment_rows(
            db=db,
            brand=b,
            category_code=category_code,
            offset_cm=total_offset,
        )
        # If the product had an exact DB chart, still apply brand grading difference when comparing across brands
        if matched_product is not None and grading["offset_cm"] != 0.0:
            adjusted_rows = []
            for r in garment_rows:
                nr = dict(r)
                for dim in ("chest_bust_cm", "underbust_cm", "waist_cm", "hips_cm", "thigh_cm"):
                    if nr.get(dim) is not None:
                        nr[dim] = round(float(nr[dim]) + style_extra_offset, 1)
                adjusted_rows.append(nr)
            garment_rows = adjusted_rows

        ranked_options, explanation = engine.recommend(
            category_code=category_code,
            body_measurements=body_cm,
            garment_rows=garment_rows,
            fit_preference=fit_pref,
            product_stretch_pct=min(20.0, float(stretch_pct) + style_stretch_bonus),
            verification_status="verified",
            top_n=min(5, len(garment_rows)),
        )
        best_opt = ranked_options[0]
        rec_size = best_opt.size_label

        # Model 1: Size prediction for this brand
        m1_res: Dict[str, Any] = {}
        try:
            m1_res = default_model_service.predict_size(
                profile={
                    "height": height_val,
                    "weight": f"{weight_kg} kg",
                    "bust": chest_val,
                    "waist": waist_val,
                    "hip": hips_val,
                    "fit_preference": "tight" if fit_pref == "slim" else ("loose" if fit_pref == "relaxed" else "fit"),
                },
                product={"category": ml_cat, "brand": b.name},
            )
        except Exception:
            pass

        # Model 2: Fit prediction for the chosen size in this brand
        m2_res: Dict[str, Any] = {}
        try:
            m2_res = default_model_service.predict_fit(
                profile={
                    "height": height_val,
                    "weight": f"{weight_kg} kg",
                    "bust": chest_val,
                    "waist": waist_val,
                    "hip": hips_val,
                },
                garment={"category": ml_cat, "size": rec_size, "brand": b.name},
            )
        except Exception:
            pass

        # Model 3: Physical garment dimensions for this brand, category & size
        m3_res: Dict[str, Any] = {}
        try:
            m3_res = default_model_service.predict_garment_dims(
                brand=b.name,
                category=ml_cat,
                size=rec_size,
            )
        except Exception:
            pass

        # Model 5: Return risk for this brand & recommended size
        m5_res: Dict[str, Any] = {}
        try:
            m5_res = default_model_service.predict_fit_risk(
                size=size_to_num.get(rec_size.upper(), 8.0),
                height_cm=float(height_val),
                weight_kg=float(weight_kg),
                waist_cm=float(waist_val),
                hips_cm=float(hips_val),
                category=ml_cat,
            )
        except Exception:
            pass

        fit_match_pct = int(round(best_opt.score))
        confidence_val = round(float(best_opt.confidence), 2)

        # Build dynamic fit note combining brand cut note + primary measurement ease
        primary_note_str = ""
        if best_opt.measurement_notes:
            p_note = best_opt.measurement_notes[0]
            sign = "+" if p_note.ease_cm >= 0 else ""
            primary_note_str = f" ({p_note.measurement.replace('_', '/')}: {sign}{p_note.ease_cm:.1f} cm ease for {style_clean} fit)"

        cut_note = f"{grading['cut_summary']}{primary_note_str}"

        if best_opt.fit_category == "too_tight" or grading["offset_cm"] <= -2.0:
            verdict = f"{style_clean} Fit • Runs Slim"
        elif best_opt.fit_category == "loose" or grading["offset_cm"] >= 2.5:
            verdict = f"{style_clean} Fit • Roomy Cut"
        else:
            verdict = f"Optimal {style_clean} Fit"

        cat_label_map = {
            "womens_tops": "Women's Tops",
            "mens_tops": "Men's Tops",
            "womens_bottoms": "Women's Bottoms",
            "mens_bottoms": "Men's Bottoms",
            "womens_dresses": "Women's Dresses",
        }

        results.append(
            {
                "brand_id": b.id,
                "brand": b.name,
                "slug": b.slug,
                "country": b.country or "International",
                "sizingSystem": b.sizing_system,
                "category": f"{cat_label_map.get(category_code, 'Apparel')} • {style_clean}",
                "categoryCode": category_code,
                "fitStyle": style_clean,
                "fitPreference": fit_pref,
                "productId": matched_product.id if matched_product else 1,
                "productName": matched_product.name if matched_product else f"{b.name} {style_clean} Essential",
                "recommendedSize": rec_size,
                "confidence": confidence_val,
                "fitMatchPct": fit_match_pct,
                "fitCategory": best_opt.fit_category,
                "cutNote": cut_note,
                "verdict": verdict,
                "status": "success" if fit_match_pct >= 88 else "warning",
                "missingMeasurements": explanation.missing_measurements,
                "evaluatedMeasurements": explanation.evaluated_measurements,
                "perMeasurementNotes": [n.model_dump() for n in best_opt.measurement_notes],
                "rankedSizes": [opt.model_dump() for opt in ranked_options],
                "ranked_sizes": [opt.model_dump() for opt in ranked_options],
                "garmentChart": garment_rows,
                "mlSuite": {
                    "model_1_size": m1_res,
                    "model_2_fit": m2_res,
                    "model_3_garment_dims": m3_res,
                    "model_4_body_shape": body_shape_info,
                    "model_5_fit_risk": m5_res,
                },
                "ml_predictions": {
                    "size_prediction": m1_res,
                    "fit_prediction": m2_res,
                    "garment_dims": m3_res,
                    "body_shape": body_shape_info,
                    "fit_risk": m5_res,
                },
            }
        )

    return results


@router.get("/catalog-styles")
async def get_catalog_styles() -> Dict[str, List[str]]:
    """Return the authoritative fit-style catalog per gender and category."""
    return FIT_STYLE_CATALOG


@router.get("/brands")
async def get_multi_brand_comparison(
    category: str = Query(default="womens_tops"),
    gender: str = Query(default="female"),
    fit_style: str = Query(default="Regular"),
    chest_bust: Optional[float] = Query(default=None),
    waist: Optional[float] = Query(default=None),
    hips: Optional[float] = Query(default=None),
    height: Optional[float] = Query(default=None),
    weight: Optional[float] = Query(default=None),
    shoulder: Optional[float] = Query(default=None),
    inseam: Optional[float] = Query(default=None),
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
) -> List[Dict[str, Any]]:
    """Compare recommended sizes, ease notes, and 5-model outputs across all active brands."""
    profile: Optional[BodyMeasurementProfile] = None
    if current_user:
        profile = db.scalar(
            select(BodyMeasurementProfile)
            .where(BodyMeasurementProfile.user_id == current_user.id)
            .order_by(BodyMeasurementProfile.is_default.desc(), BodyMeasurementProfile.updated_at.desc())
        )

    is_male = gender.lower() in ("male", "men") or "mens" in category.lower()
    body_cm: Dict[str, Optional[float]] = {
        "chest_bust": chest_bust or (profile.chest_bust_cm if profile else (98.0 if is_male else 92.0)),
        "waist": waist or (profile.waist_cm if profile else (84.0 if is_male else 74.0)),
        "hips": hips or (profile.hips_cm if profile else (99.0 if is_male else 98.0)),
        "height": height or (profile.height_cm if profile else (178.0 if is_male else 168.0)),
        "shoulder": shoulder if shoulder is not None else (profile.shoulder_cm if profile else None),
        "inseam": inseam if inseam is not None else (profile.inseam_cm if profile else None),
        "underbust": profile.underbust_cm if profile else None,
        "sleeve": profile.sleeve_cm if profile else None,
        "torso": profile.torso_cm if profile else None,
        "thigh": profile.thigh_cm if profile else None,
        "rise": profile.rise_cm if profile else None,
    }
    weight_val = weight or (profile.weight_kg if profile and profile.weight_kg else (75.0 if is_male else 62.0))

    return evaluate_brands_for_measurements(
        db=db,
        gender="male" if is_male else "female",
        category=category,
        fit_style=fit_style,
        body_cm=body_cm,
        weight_kg=float(weight_val),
    )


@router.post("/brands")
async def post_multi_brand_comparison(
    payload: MultiBrandComparisonRequest,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
) -> List[Dict[str, Any]]:
    """Compute cross-brand recommendations for the given category, fit style, and measurements (with optional fields)."""
    profile: Optional[BodyMeasurementProfile] = None
    if payload.measurement_profile_id:
        profile = db.get(BodyMeasurementProfile, payload.measurement_profile_id)
    elif current_user:
        profile = db.scalar(
            select(BodyMeasurementProfile)
            .where(BodyMeasurementProfile.user_id == current_user.id)
            .order_by(BodyMeasurementProfile.is_default.desc(), BodyMeasurementProfile.updated_at.desc())
        )

    is_in = payload.unit.strip().lower() in ("in", "inch", "inches")

    def _to_cm(val: Optional[float], is_height: bool = False) -> Optional[float]:
        if val is None:
            return None
        if is_in:
            return round(float(val) * 2.54, 2)
        if is_height:
            return float(parse_height_to_cm(val))
        return float(parse_circumference_to_cm(val))

    is_male = payload.gender.strip().lower() in ("male", "men")
    category_code = _resolve_canonical_category_code(payload.gender, payload.category)

    chest_cm = _to_cm(payload.chest_bust)
    if chest_cm is None and "bottoms" not in category_code:
        chest_cm = (profile.chest_bust_cm if profile else None) or (98.0 if is_male else 92.0)

    waist_cm = _to_cm(payload.waist)
    if waist_cm is None:
        waist_cm = (profile.waist_cm if profile else None) or (84.0 if is_male else 74.0)

    hips_cm = _to_cm(payload.hips)
    if hips_cm is None and "tops" not in category_code:
        hips_cm = (profile.hips_cm if profile else None) or (99.0 if is_male else 98.0)

    height_cm = _to_cm(payload.height, is_height=True)
    if height_cm is None:
        height_cm = (profile.height_cm if profile else None) or (178.0 if is_male else 168.0)

    # Optional fields: only include if explicitly provided in payload (so skipping them is respected!)
    shoulder_cm = _to_cm(payload.shoulder)
    inseam_cm = _to_cm(payload.inseam)

    body_cm: Dict[str, Optional[float]] = {
        "chest_bust": chest_cm,
        "waist": waist_cm,
        "hips": hips_cm,
        "height": height_cm,
        "shoulder": shoulder_cm,
        "inseam": inseam_cm,
        "underbust": None,
        "sleeve": None,
        "torso": None,
        "thigh": None,
        "rise": None,
    }
    weight_kg = float(payload.weight) if payload.weight else (75.0 if is_male else 62.0)

    return evaluate_brands_for_measurements(
        db=db,
        gender="male" if is_male else "female",
        category=category_code,
        fit_style=payload.fit_style,
        body_cm=body_cm,
        weight_kg=weight_kg,
    )
