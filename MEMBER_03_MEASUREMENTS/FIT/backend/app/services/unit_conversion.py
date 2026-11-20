"""Unit conversion and measurement range validation service."""

from typing import Dict, List, Optional, Tuple

from app.core.exceptions import AppException

CM_PER_INCH: float = 2.54
KG_PER_LB: float = 0.45359237

LINEAR_MEASUREMENT_FIELDS: List[str] = [
    "chest_bust",
    "underbust",
    "shoulder",
    "sleeve",
    "torso",
    "waist",
    "hips",
    "inseam",
    "thigh",
    "rise",
    "height",
]

# Realistic adult human body measurement ranges in centimetres (min_cm, max_cm)
MEASUREMENT_RANGES_CM: Dict[str, Tuple[float, float]] = {
    "chest_bust": (65.0, 165.0),
    "underbust": (55.0, 145.0),
    "shoulder": (30.0, 65.0),
    "sleeve": (45.0, 95.0),
    "torso": (35.0, 85.0),
    "waist": (50.0, 160.0),
    "hips": (65.0, 175.0),
    "inseam": (55.0, 105.0),
    "thigh": (35.0, 95.0),
    "rise": (18.0, 45.0),
    "height": (130.0, 230.0),
}

WEIGHT_RANGE_KG: Tuple[float, float] = (30.0, 250.0)

# Primary required measurements by clothing category or gender focus
# Optional measurements (e.g., shoulder for tops/dresses, inseam for bottoms) are not required here.
REQUIRED_FIELDS_BY_CLOTHING_TYPE: Dict[str, List[str]] = {
    "mens_tops": ["chest_bust"],
    "womens_tops": ["chest_bust"],
    "mens_bottoms": ["waist", "hips"],
    "womens_bottoms": ["waist", "hips"],
    "womens_dresses": ["chest_bust", "waist", "hips"],
    "full_body": ["chest_bust", "waist", "hips"],
}


def inches_to_cm(value_in_inches: float) -> float:
    """Convert inches to centimetres (1 in = 2.54 cm) rounded to 2 decimal places."""
    if value_in_inches <= 0:
        raise ValueError("Measurement in inches must be positive.")
    return round(value_in_inches * CM_PER_INCH, 2)


def cm_to_inches(value_in_cm: float) -> float:
    """Convert centimetres to inches rounded to 2 decimal places."""
    if value_in_cm <= 0:
        raise ValueError("Measurement in centimetres must be positive.")
    return round(value_in_cm / CM_PER_INCH, 2)


def lbs_to_kg(value_in_lbs: float) -> float:
    """Convert pounds to kilograms rounded to 2 decimal places."""
    if value_in_lbs <= 0:
        raise ValueError("Weight in pounds must be positive.")
    return round(value_in_lbs * KG_PER_LB, 2)


def convert_to_cm(value: Optional[float], unit: str) -> Optional[float]:
    """Convert a linear measurement to centimetres if unit is 'in' or 'inches'."""
    if value is None:
        return None
    normalized_unit = unit.lower().strip()
    if normalized_unit in ("cm", "centimeter", "centimetre", "centimeters", "centimetres"):
        return round(float(value), 2)
    if normalized_unit in ("in", "inch", "inches"):
        return inches_to_cm(float(value))
    raise ValueError(f"Unsupported measurement unit '{unit}'. Use 'cm' or 'in'.")


def convert_weight_to_kg(weight: Optional[float], weight_unit: str = "kg") -> Optional[float]:
    """Convert weight to kilograms from 'kg' or 'lb'/'lbs'."""
    if weight is None:
        return None
    normalized_unit = weight_unit.lower().strip()
    if normalized_unit in ("kg", "kilogram", "kilograms"):
        return round(float(weight), 2)
    if normalized_unit in ("lb", "lbs", "pound", "pounds"):
        return lbs_to_kg(float(weight))
    raise ValueError(f"Unsupported weight unit '{weight_unit}'. Use 'kg' or 'lbs'.")


def validate_measurement_ranges_cm(
    measurements_cm: Dict[str, Optional[float]],
    weight_kg: Optional[float] = None,
    gender: str = "unisex",
    target_category: Optional[str] = None,
) -> List[str]:
    """
    Validate converted measurements (in cm) against realistic physiological bounds
    and check required fields for the specified gender/clothing type.
    Returns a list of human-readable validation error strings.
    """
    errors: List[str] = []

    provided_count = 0
    for field_name, (min_cm, max_cm) in MEASUREMENT_RANGES_CM.items():
        val = measurements_cm.get(field_name)
        if val is not None:
            provided_count += 1
            if not (min_cm <= val <= max_cm):
                errors.append(
                    f"'{field_name}' ({val} cm) is outside the realistic human range "
                    f"of {min_cm} cm to {max_cm} cm."
                )

    if weight_kg is not None:
        min_w, max_w = WEIGHT_RANGE_KG
        if not (min_w <= weight_kg <= max_w):
            errors.append(
                f"'weight' ({weight_kg} kg) is outside the realistic range of {min_w} kg to {max_w} kg."
            )

    if provided_count == 0:
        errors.append("At least one body measurement (e.g., chest_bust, waist, hips) must be provided.")

    # Logical cross-field checks
    chest = measurements_cm.get("chest_bust")
    underbust = measurements_cm.get("underbust")
    if chest is not None and underbust is not None and underbust >= chest:
        errors.append(
            f"'underbust' ({underbust} cm) must be smaller than 'chest_bust' ({chest} cm)."
        )

    # Category-specific required fields check if requested
    if target_category and target_category in REQUIRED_FIELDS_BY_CLOTHING_TYPE:
        required_fields = REQUIRED_FIELDS_BY_CLOTHING_TYPE[target_category]
        missing = [f for f in required_fields if measurements_cm.get(f) is None]
        if missing:
            errors.append(
                f"Missing required measurements for '{target_category}': {', '.join(missing)}."
            )

    # Gender-specific validation hints
    if gender == "female" and target_category == "womens_tops" and chest is None:
        errors.append("Bust ('chest_bust') measurement is required for women's tops.")

    return errors


def normalize_and_validate_measurements(
    raw_measurements: Dict[str, Optional[float]],
    unit: str = "cm",
    weight: Optional[float] = None,
    weight_unit: str = "kg",
    gender: str = "unisex",
    target_category: Optional[str] = None,
) -> Tuple[Dict[str, Optional[float]], Optional[float]]:
    """
    Convert all linear measurements from `unit` to cm, weight to kg,
    and raise AppException (422) if any value fails validation.
    """
    measurements_cm: Dict[str, Optional[float]] = {}
    try:
        for field in LINEAR_MEASUREMENT_FIELDS:
            measurements_cm[field] = convert_to_cm(raw_measurements.get(field), unit)
        weight_kg = convert_weight_to_kg(weight, weight_unit)
    except ValueError as exc:
        raise AppException(
            message=str(exc),
            status_code=422,
            error_code="INVALID_UNIT",
        ) from exc

    errors = validate_measurement_ranges_cm(
        measurements_cm=measurements_cm,
        weight_kg=weight_kg,
        gender=gender,
        target_category=target_category,
    )
    if errors:
        raise AppException(
            message="; ".join(errors),
            status_code=422,
            error_code="MEASUREMENT_VALIDATION_ERROR",
            details={"errors": errors},
        )

    return measurements_cm, weight_kg
