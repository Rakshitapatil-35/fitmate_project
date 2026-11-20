"""
Single source of truth for FITMATE Fit-Style Catalog, ease/stretch parameters,
category validation, and idempotent bottoms-slim -> Skinny migration.
"""

from datetime import datetime, timezone
import json
from typing import Any, Dict, List
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import AppException
from app.models.measurement import BodyMeasurementProfile

# Authoritative Fit-Style Catalog
FIT_STYLE_CATALOG: Dict[str, List[str]] = {
    "mens_tops": ["T-shirts", "Regular", "Slim", "Oversized", "Sweatshirts", "Jackets", "Kurta"],
    "womens_tops": ["T-shirts", "Regular", "Slim", "Oversized", "Cropped", "Sweatshirts", "Jackets", "Kurta"],
    "mens_bottoms": ["Straight", "Loose", "Baggy", "Trousers", "Cargo", "Track Pants", "Shorts", "Skinny"],
    "womens_bottoms": ["Straight", "Loose", "Baggy", "Trousers", "Cargo", "Track Pants", "Shorts", "Skinny"],
    "womens_dresses": ["Bodycon", "A-line", "Maxi", "Jumpsuit"],
}

# Ease, stretch, and ML mapping for every style ID
STYLE_PARAMETERS: Dict[str, Dict[str, Any]] = {
    # Tops
    "t-shirts": {"fit_preference": "regular", "ease_offset_cm": 0.0, "stretch_bonus_pct": 4.0},
    "regular": {"fit_preference": "regular", "ease_offset_cm": 0.0, "stretch_bonus_pct": 0.0},
    "slim": {"fit_preference": "slim", "ease_offset_cm": 0.0, "stretch_bonus_pct": 1.0},
    "oversized": {"fit_preference": "relaxed", "ease_offset_cm": -2.0, "stretch_bonus_pct": 0.0},
    "cropped": {"fit_preference": "slim", "ease_offset_cm": 0.5, "stretch_bonus_pct": 2.0},
    "sweatshirts": {"fit_preference": "relaxed", "ease_offset_cm": -1.0, "stretch_bonus_pct": 4.0},
    "jackets": {"fit_preference": "regular", "ease_offset_cm": -1.5, "stretch_bonus_pct": 0.0},
    "kurta": {"fit_preference": "relaxed", "ease_offset_cm": -0.5, "stretch_bonus_pct": 0.0},
    # Bottoms
    "straight": {"fit_preference": "regular", "ease_offset_cm": 0.0, "stretch_bonus_pct": 0.0},
    "loose": {"fit_preference": "relaxed", "ease_offset_cm": -0.5, "stretch_bonus_pct": 0.0},
    "baggy": {"fit_preference": "relaxed", "ease_offset_cm": -2.0, "stretch_bonus_pct": 0.0},
    "trousers": {"fit_preference": "regular", "ease_offset_cm": 0.0, "stretch_bonus_pct": 0.0},
    "cargo": {"fit_preference": "relaxed", "ease_offset_cm": -1.0, "stretch_bonus_pct": 1.0},
    "track pants": {"fit_preference": "relaxed", "ease_offset_cm": 0.0, "stretch_bonus_pct": 6.0},
    "shorts": {"fit_preference": "regular", "ease_offset_cm": 0.0, "stretch_bonus_pct": 2.0},
    "skinny": {"fit_preference": "slim", "ease_offset_cm": 1.5, "stretch_bonus_pct": 4.0},
    # Dresses & Jumpsuit
    "bodycon": {"fit_preference": "slim", "ease_offset_cm": 1.5, "stretch_bonus_pct": 6.0},
    "a-line": {"fit_preference": "regular", "ease_offset_cm": 0.0, "stretch_bonus_pct": 0.0},
    "aline": {"fit_preference": "regular", "ease_offset_cm": 0.0, "stretch_bonus_pct": 0.0},
    "maxi": {"fit_preference": "relaxed", "ease_offset_cm": 0.0, "stretch_bonus_pct": 0.0},
    "jumpsuit": {"fit_preference": "regular", "ease_offset_cm": 0.0, "stretch_bonus_pct": 2.0},
    # Legacy alias kept only for backward compatibility if directly requested
    "shift": {"fit_preference": "relaxed", "ease_offset_cm": 0.0, "stretch_bonus_pct": 0.0},
}

FIT_STYLE_TO_PREFERENCE: Dict[str, str] = {
    k: v["fit_preference"] for k, v in STYLE_PARAMETERS.items()
}


def validate_fit_style_for_category(category_code: str, fit_style: str) -> str:
    """
    Validate fit_style against the authoritative category catalog.
    Explicitly rejects 'Slim' for bottoms (must use 'Skinny').
    """
    style_clean = (fit_style or "Regular").strip()
    style_low = style_clean.lower()

    if "bottom" in category_code and style_low == "slim":
        raise AppException(
            message="Fit style 'Slim' has been removed from bottoms. Please use 'Skinny' or 'Straight' instead.",
            status_code=422,
        )

    allowed = FIT_STYLE_CATALOG.get(category_code)
    if allowed:
        for item in allowed:
            if item.lower() == style_low:
                return item
    return style_clean


def migrate_bottoms_slim_to_skinny(db: Session) -> int:
    """
    Idempotently migrate any existing bottoms BodyMeasurementProfile rows
    with fit_style='Slim' (case-insensitive) to fit_style='Skinny' without
    losing saved measurements or prior history.
    """
    profiles = db.scalars(select(BodyMeasurementProfile)).all()
    migrated_count = 0
    for prof in profiles:
        cat = (prof.target_category or "").lower()
        name = (prof.profile_name or "").lower()
        is_bottoms = "bottom" in cat or "bottom" in name
        if is_bottoms and prof.fit_style and prof.fit_style.strip().lower() == "slim":
            prof.fit_style = "Skinny"
            if prof.fit_preference == "regular":
                prof.fit_preference = "slim"
            history_list = prof.history
            history_list.insert(
                0,
                {
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "action": "migrated",
                    "changes": {
                        "fit_style": {"from": "Slim", "to": "Skinny"},
                        "reason": "Catalog update: Slim removed from bottoms and migrated to Skinny",
                    },
                },
            )
            prof.history_json = json.dumps(history_list[:20])
            prof.updated_at = datetime.now(timezone.utc)
            migrated_count += 1

    if migrated_count > 0:
        db.commit()
    return migrated_count
