"""Body measurement profile router: CRUD for multiple profiles + unit conversion utility."""

from datetime import datetime, timezone
import json
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundException
from app.database import get_db
from app.dependencies import get_current_or_guest_user
from app.models.measurement import BodyMeasurementProfile
from app.models.user import User
from app.schemas.common import MessageResponse
from app.schemas.measurement import (
    MeasurementCreateRequest,
    MeasurementProfileResponse,
    MeasurementUpdateRequest,
    UnitConversionRequest,
    UnitConversionResponse,
)
from app.services.catalog_styles import validate_fit_style_for_category
from app.services.unit_conversion import (
    LINEAR_MEASUREMENT_FIELDS,
    cm_to_inches,
    inches_to_cm,
    normalize_and_validate_measurements,
)

router = APIRouter(prefix="/measurements", tags=["Body Measurements"])


@router.post("/convert", response_model=UnitConversionResponse)
async def convert_measurement_unit(payload: UnitConversionRequest) -> UnitConversionResponse:
    """Convert a linear measurement value between inches ('in') and centimetres ('cm')."""
    if payload.from_unit == payload.to_unit:
        converted = round(payload.value, 2)
    elif payload.from_unit == "in" and payload.to_unit == "cm":
        converted = inches_to_cm(payload.value)
    else:
        converted = cm_to_inches(payload.value)

    return UnitConversionResponse(
        original_value=payload.value,
        from_unit=payload.from_unit,
        converted_value=converted,
        to_unit=payload.to_unit,
    )


@router.post(
    "",
    response_model=MeasurementProfileResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_measurement_profile(
    payload: MeasurementCreateRequest,
    current_user: User = Depends(get_current_or_guest_user),
    db: Session = Depends(get_db),
) -> BodyMeasurementProfile:
    """
    Save a new body measurement profile for the current user.
    Accepts either 'cm' or 'in' and stores all dimensions normalized in centimetres.
    """
    raw_dict = {f: getattr(payload, f) for f in LINEAR_MEASUREMENT_FIELDS}
    measurements_cm, weight_kg = normalize_and_validate_measurements(
        raw_measurements=raw_dict,
        unit=payload.unit,
        weight=payload.weight,
        weight_unit=payload.weight_unit,
        gender=payload.gender,
        target_category=payload.target_category,
    )

    existing_count = len(
        db.scalars(
            select(BodyMeasurementProfile).where(BodyMeasurementProfile.user_id == current_user.id)
        ).all()
    )
    make_default = payload.is_default or (existing_count == 0)

    if make_default:
        db.execute(
            update(BodyMeasurementProfile)
            .where(BodyMeasurementProfile.user_id == current_user.id)
            .values(is_default=False)
        )

    body_shape_val = getattr(payload, "body_shape", None)
    if not body_shape_val and measurements_cm.get("height") and weight_kg and measurements_cm.get("waist"):
        try:
            from app.services.model_service import default_model_service
            gender_tag = "male" if "men" in str(payload.gender).lower() else "female"
            bs_res = default_model_service.predict_body_shape(
                gender=gender_tag,
                height_cm=float(measurements_cm["height"]),
                weight_kg=float(weight_kg),
                waist_cm=float(measurements_cm["waist"]),
            )
            body_shape_val = bs_res.get("body_shape")
        except Exception:
            pass

    initial_history = [
        {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "action": "created",
            "category": payload.target_category,
            "fit_style": getattr(payload, "fit_style", None),
            "snapshot": {
                "chest_bust_cm": measurements_cm["chest_bust"],
                "waist_cm": measurements_cm["waist"],
                "hips_cm": measurements_cm["hips"],
                "height_cm": measurements_cm["height"],
                "shoulder_cm": measurements_cm["shoulder"],
                "inseam_cm": measurements_cm["inseam"],
                "weight_kg": weight_kg,
            },
        }
    ]

    resolved_fit_style = getattr(payload, "fit_style", None)
    if resolved_fit_style and payload.target_category:
        resolved_fit_style = validate_fit_style_for_category(payload.target_category, resolved_fit_style)

    profile = BodyMeasurementProfile(
        user_id=current_user.id,
        profile_name=payload.profile_name.strip(),
        gender=payload.gender,
        fit_preference=payload.fit_preference,
        original_unit=payload.unit,
        is_default=make_default,
        chest_bust_cm=measurements_cm["chest_bust"],
        underbust_cm=measurements_cm["underbust"],
        shoulder_cm=measurements_cm["shoulder"],
        sleeve_cm=measurements_cm["sleeve"],
        torso_cm=measurements_cm["torso"],
        waist_cm=measurements_cm["waist"],
        hips_cm=measurements_cm["hips"],
        inseam_cm=measurements_cm["inseam"],
        thigh_cm=measurements_cm["thigh"],
        rise_cm=measurements_cm["rise"],
        height_cm=measurements_cm["height"],
        weight_kg=weight_kg,
        body_shape=body_shape_val,
        target_category=payload.target_category,
        fit_style=resolved_fit_style,
        history_json=json.dumps(initial_history),
    )
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile


@router.get("", response_model=List[MeasurementProfileResponse])
async def list_measurement_profiles(
    gender: Optional[str] = Query(default=None),
    target_category: Optional[str] = Query(default=None),
    current_user: User = Depends(get_current_or_guest_user),
    db: Session = Depends(get_db),
) -> List[BodyMeasurementProfile]:
    """Retrieve all saved body measurement profiles for the current user, with optional gender/category filter."""
    stmt = (
        select(BodyMeasurementProfile)
        .where(BodyMeasurementProfile.user_id == current_user.id)
        .order_by(BodyMeasurementProfile.is_default.desc(), BodyMeasurementProfile.updated_at.desc())
    )
    if gender:
        stmt = stmt.where(BodyMeasurementProfile.gender == gender)
    if target_category:
        stmt = stmt.where(BodyMeasurementProfile.target_category == target_category)
    return list(db.scalars(stmt).all())


@router.get("/{profile_id}", response_model=MeasurementProfileResponse)
async def get_measurement_profile(
    profile_id: int,
    current_user: User = Depends(get_current_or_guest_user),
    db: Session = Depends(get_db),
) -> BodyMeasurementProfile:
    """Retrieve a specific body measurement profile belonging to the current user."""
    profile = db.get(BodyMeasurementProfile, profile_id)
    if profile is None or profile.user_id != current_user.id:
        raise NotFoundException(f"Measurement profile with id={profile_id} not found.")
    return profile


@router.put("/{profile_id}", response_model=MeasurementProfileResponse)
@router.patch("/{profile_id}", response_model=MeasurementProfileResponse)
async def update_measurement_profile(
    profile_id: int,
    payload: MeasurementUpdateRequest,
    current_user: User = Depends(get_current_or_guest_user),
    db: Session = Depends(get_db),
) -> BodyMeasurementProfile:
    """Update an existing body measurement profile (converting inches to cm if unit='in') and record edit history."""
    profile = db.get(BodyMeasurementProfile, profile_id)
    if profile is None or profile.user_id != current_user.id:
        raise NotFoundException(f"Measurement profile with id={profile_id} not found.")

    previous_snapshot: Dict[str, Any] = {
        f"{f}_cm": getattr(profile, f"{f}_cm") for f in LINEAR_MEASUREMENT_FIELDS
    }
    previous_snapshot["weight_kg"] = profile.weight_kg
    previous_snapshot["fit_preference"] = profile.fit_preference
    previous_snapshot["fit_style"] = profile.fit_style

    # Merge existing cm measurements with any newly supplied fields converted to cm
    incoming_any = any(getattr(payload, f) is not None for f in LINEAR_MEASUREMENT_FIELDS)
    if incoming_any or payload.weight is not None or payload.target_category is not None:
        raw_incoming = {}
        for f in LINEAR_MEASUREMENT_FIELDS:
            val = getattr(payload, f)
            if val is not None:
                raw_incoming[f] = val
            else:
                # Existing value is already in cm; if payload.unit=='in', convert back temporarily or handle directly
                existing_cm = getattr(profile, f"{f}_cm")
                if existing_cm is not None and payload.unit == "in":
                    raw_incoming[f] = existing_cm / 2.54
                else:
                    raw_incoming[f] = existing_cm

        measurements_cm, weight_kg = normalize_and_validate_measurements(
            raw_measurements=raw_incoming,
            unit=payload.unit,
            weight=payload.weight if payload.weight is not None else profile.weight_kg,
            weight_unit=payload.weight_unit if payload.weight is not None else "kg",
            gender=payload.gender or profile.gender,
            target_category=payload.target_category,
        )

        for f in LINEAR_MEASUREMENT_FIELDS:
            if getattr(payload, f) is not None:
                setattr(profile, f"{f}_cm", measurements_cm[f])
        if payload.weight is not None:
            profile.weight_kg = weight_kg
        profile.original_unit = payload.unit

    if payload.clear_optional_fields:
        for opt_field in payload.clear_optional_fields:
            if opt_field in ("shoulder", "inseam", "underbust", "sleeve", "torso", "thigh", "rise", "weight"):
                col_name = "weight_kg" if opt_field == "weight" else f"{opt_field}_cm"
                setattr(profile, col_name, None)

    if payload.profile_name is not None:
        profile.profile_name = payload.profile_name.strip()
    if payload.gender is not None:
        profile.gender = payload.gender
    if payload.fit_preference is not None:
        profile.fit_preference = payload.fit_preference
    if payload.target_category is not None:
        profile.target_category = payload.target_category
    if payload.fit_style is not None:
        cat_for_check = payload.target_category or profile.target_category or ""
        profile.fit_style = validate_fit_style_for_category(cat_for_check, payload.fit_style) if cat_for_check else payload.fit_style.strip()
    if payload.body_shape is not None:
        profile.body_shape = payload.body_shape.strip()
    if payload.is_default is True:
        db.execute(
            update(BodyMeasurementProfile)
            .where(BodyMeasurementProfile.user_id == current_user.id)
            .values(is_default=False)
        )
        profile.is_default = True
    elif payload.is_default is False:
        profile.is_default = False

    # Compute delta changes and append to profile.history_json
    changes: Dict[str, Any] = {}
    for f in LINEAR_MEASUREMENT_FIELDS:
        col = f"{f}_cm"
        old_val = previous_snapshot.get(col)
        new_val = getattr(profile, col)
        if old_val != new_val:
            changes[col] = {"from": old_val, "to": new_val}
    if previous_snapshot.get("weight_kg") != profile.weight_kg:
        changes["weight_kg"] = {"from": previous_snapshot.get("weight_kg"), "to": profile.weight_kg}
    if previous_snapshot.get("fit_style") != profile.fit_style:
        changes["fit_style"] = {"from": previous_snapshot.get("fit_style"), "to": profile.fit_style}

    history_list = profile.history
    history_list.insert(
        0,
        {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "action": "updated",
            "changes": changes,
        },
    )
    profile.history_json = json.dumps(history_list[:20])
    profile.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(profile)
    return profile


@router.post("/{profile_id}/reset", response_model=MeasurementProfileResponse)
async def reset_measurement_profile(
    profile_id: int,
    current_user: User = Depends(get_current_or_guest_user),
    db: Session = Depends(get_db),
) -> BodyMeasurementProfile:
    """Reset a saved measurement profile to baseline defaults while preserving history."""
    profile = db.get(BodyMeasurementProfile, profile_id)
    if profile is None or profile.user_id != current_user.id:
        raise NotFoundException(f"Measurement profile with id={profile_id} not found.")

    is_male = str(profile.gender).lower() == "male"
    profile.chest_bust_cm = 98.0 if is_male else 92.0
    profile.waist_cm = 84.0 if is_male else 74.0
    profile.hips_cm = 99.0 if is_male else 98.0
    profile.height_cm = 178.0 if is_male else 168.0
    profile.weight_kg = 75.0 if is_male else 62.0
    profile.shoulder_cm = None
    profile.inseam_cm = None

    history_list = profile.history
    history_list.insert(
        0,
        {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "action": "reset",
            "changes": {"reset_to_defaults": True},
        },
    )
    profile.history_json = json.dumps(history_list[:20])
    profile.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(profile)
    return profile


@router.post("/{profile_id}/default", response_model=MeasurementProfileResponse)
async def set_default_measurement_profile(
    profile_id: int,
    current_user: User = Depends(get_current_or_guest_user),
    db: Session = Depends(get_db),
) -> BodyMeasurementProfile:
    """Set a measurement profile as the default for the current user."""
    profile = db.get(BodyMeasurementProfile, profile_id)
    if profile is None or profile.user_id != current_user.id:
        raise NotFoundException(f"Measurement profile with id={profile_id} not found.")

    db.execute(
        update(BodyMeasurementProfile)
        .where(BodyMeasurementProfile.user_id == current_user.id)
        .values(is_default=False)
    )
    profile.is_default = True
    db.commit()
    db.refresh(profile)
    return profile


@router.delete("/{profile_id}", response_model=MessageResponse)
async def delete_measurement_profile(
    profile_id: int,
    current_user: User = Depends(get_current_or_guest_user),
    db: Session = Depends(get_db),
) -> MessageResponse:
    """Delete a saved body measurement profile."""
    profile = db.get(BodyMeasurementProfile, profile_id)
    if profile is None or profile.user_id != current_user.id:
        raise NotFoundException(f"Measurement profile with id={profile_id} not found.")

    db.delete(profile)
    db.commit()
    return MessageResponse(success=True, message=f"Measurement profile {profile_id} deleted.")
