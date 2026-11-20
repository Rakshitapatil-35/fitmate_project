"""
FITMATE ML Platform - Prediction Engine
Exposes high-level inference functions with comprehensive input validation,
unit conversion, and fallback handling:
  - predict_size(profile: dict, product: dict) -> {size, probabilities, confidence}
  - predict_fit(profile: dict, garment: dict) -> {fit_class, probabilities}
  - predict_garment_dims(brand, category, size, extra: dict) -> {dims_cm, interval, "estimated": true}
"""

import os
from pathlib import Path
import joblib
import numpy as np
import pandas as pd
from src.utils import (
    parse_height_to_cm, parse_weight_to_kg, parse_bust_size,
    parse_inches_to_cm, parse_circumference_to_cm, normalise_size_label, standardise_category,
    SIZE_ORDER, FIT_CLASSES
)

# Global cached model artifacts
_MODEL_1 = None
_MODEL_2 = None
_MODEL_3 = None
_BACKEND_DIR = Path(__file__).resolve().parent.parent


def _resolve_model_path(rel_path: str) -> str:
    if os.path.exists(rel_path):
        return rel_path
    candidate = _BACKEND_DIR / rel_path
    if candidate.exists():
        return str(candidate)
    return rel_path


def get_model_1():
    global _MODEL_1
    if _MODEL_1 is None:
        path = _resolve_model_path('models/model_1_size.joblib')
        if not os.path.exists(path):
            raise FileNotFoundError(f"Model 1 artifact not found at {path}. Run training first.")
        _MODEL_1 = joblib.load(path)
    return _MODEL_1

def get_model_2():
    global _MODEL_2
    if _MODEL_2 is None:
        path = _resolve_model_path('models/model_2_fit.joblib')
        if not os.path.exists(path):
            raise FileNotFoundError(f"Model 2 artifact not found at {path}. Run training first.")
        _MODEL_2 = joblib.load(path)
    return _MODEL_2

def get_model_3():
    global _MODEL_3
    if _MODEL_3 is None:
        path = _resolve_model_path('models/model_3_garment.joblib')
        if not os.path.exists(path):
            raise FileNotFoundError(f"Model 3 artifact not found at {path}. Run training first.")
        _MODEL_3 = joblib.load(path)
    return _MODEL_3

def validate_domain_ranges(measurements: dict):
    """
    Validate that inputs are within sensible physical domain ranges.
    Raises ValueError with descriptive messaging if an impossible value is provided.
    """
    h = measurements.get('height_cm')
    if h is not None and not np.isnan(h):
        if h < 100 or h > 250:
            raise ValueError(f"Height {h:.1f} cm is outside human biological range (100 - 250 cm).")

    w = measurements.get('weight_kg')
    if w is not None and not np.isnan(w):
        if w < 25 or w > 250:
            raise ValueError(f"Weight {w:.1f} kg is outside valid adult range (25 - 250 kg).")

    age = measurements.get('age')
    if age is not None and not np.isnan(age):
        if age < 10 or age > 120:
            raise ValueError(f"Age {age} is outside valid range (10 - 120 years).")

    for col in ['bust_cm', 'waist_cm', 'hip_cm']:
        v = measurements.get(col)
        if v is not None and not np.isnan(v):
            if v < 40 or v > 220:
                raise ValueError(f"{col} value {v:.1f} cm is outside realistic apparel measurement range (40 - 220 cm).")

def extract_profile_features(profile: dict) -> dict:
    """Parse and normalize body profile fields into metric cm/kg."""
    if not isinstance(profile, dict):
        raise ValueError("Profile must be a dictionary of user measurements.")
        
    height_raw = profile.get('height')
    weight_raw = profile.get('weight')
    age_raw = profile.get('age')
    bust_raw = profile.get('bust')
    waist_raw = profile.get('waist')
    hip_raw = profile.get('hip') if profile.get('hip') is not None else profile.get('hips')
    
    height_cm = parse_height_to_cm(height_raw) if height_raw is not None else np.nan
    weight_kg = parse_weight_to_kg(weight_raw) if weight_raw is not None else np.nan
    
    age = float(age_raw) if age_raw is not None and str(age_raw).strip() != '' else np.nan
    
    # Bust handling
    bust_cm = np.nan
    if bust_raw is not None:
        _, b_cm, _ = parse_bust_size(bust_raw)
        bust_cm = b_cm
        
    waist_cm = parse_circumference_to_cm(waist_raw) if waist_raw is not None else np.nan
    hip_cm = parse_circumference_to_cm(hip_raw) if hip_raw is not None else np.nan
            
    # Check that at least one measurement is given
    valid_vals = [v for v in [height_cm, weight_kg, age, bust_cm, waist_cm, hip_cm] if not np.isnan(v)]
    if not valid_vals:
        raise ValueError("At least one body measurement (height, weight, bust, waist, or hip) must be provided.")
        
    measurements = {
        'height_cm': height_cm,
        'weight_kg': weight_kg,
        'age': age,
        'bust_cm': bust_cm,
        'waist_cm': waist_cm,
        'hip_cm': hip_cm
    }
    validate_domain_ranges(measurements)
    return measurements

def predict_size(profile: dict, product: dict = None) -> dict:
    """
    Predict clothing size label from user profile and product details.
    
    Args:
        profile: dict with height, weight, age, bust, waist, hip, fit_preference
        product: dict with category, brand (optional)
        
    Returns:
        dict: {size: str, probabilities: dict, confidence: float}
    """
    model = get_model_1()
    product = product or {}
    
    measurements = extract_profile_features(profile)
    category = standardise_category(product.get('category', 'top'))
    fit_pref = str(profile.get('fit_preference', 'fit')).strip().lower()
    if fit_pref not in ['tight', 'fit', 'loose']:
        fit_pref = 'fit'
        
    # Build single-row DataFrame matching training feature schema
    row = {
        'height_cm': measurements['height_cm'],
        'weight_kg': measurements['weight_kg'],
        'age': measurements['age'],
        'bust_cm': measurements['bust_cm'],
        'waist_cm': measurements['waist_cm'],
        'hip_cm': measurements['hip_cm'],
        'height_cm_was_missing': int(np.isnan(measurements['height_cm'])),
        'weight_kg_was_missing': int(np.isnan(measurements['weight_kg'])),
        'age_was_missing': int(np.isnan(measurements['age'])),
        'bust_cm_was_missing': int(np.isnan(measurements['bust_cm'])),
        'waist_cm_was_missing': int(np.isnan(measurements['waist_cm'])),
        'hip_cm_was_missing': int(np.isnan(measurements['hip_cm'])),
        'category': category,
        'fit_preference': fit_pref
    }
    df_in = pd.DataFrame([row])
    
    # Predict
    pred_idx = model.predict(df_in)[0]
    probabilities_raw = model.predict_proba(df_in)[0]
    
    # Target classes from training
    classes = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL']
    predicted_size = classes[pred_idx]
    
    probs_dict = {cls_name: round(float(prob), 4) for cls_name, prob in zip(classes, probabilities_raw)}
    confidence = round(float(probabilities_raw[pred_idx]), 4)
    
    return {
        'size': predicted_size,
        'probabilities': probs_dict,
        'confidence': confidence
    }

def predict_fit(profile: dict, garment: dict) -> dict:
    """
    Predict fit class (tight, fit, loose) for a specific garment size.
    
    Args:
        profile: dict with body measurements
        garment: dict with category and size (e.g. 'M', '12', 'S')
        
    Returns:
        dict: {fit_class: str, probabilities: dict}
    """
    pipeline_dict = get_model_2()
    preprocessor = pipeline_dict['preprocessor']
    calibrated_model = pipeline_dict['calibrated_model']
    base_model = pipeline_dict['base_model']
    classes = pipeline_dict['classes']
    
    measurements = extract_profile_features(profile)
    
    raw_size = garment.get('size')
    if raw_size is None:
        raise ValueError("Garment size must be specified (e.g. size='M' or size=8).")
    norm_size = normalise_size_label(raw_size)
    if pd.isnull(norm_size):
        raise ValueError(f"Unrecognized garment size: '{raw_size}'. Must map to XXS-XXXL.")
        
    category = standardise_category(garment.get('category', 'top'))
    
    row = {
        'height_cm': measurements['height_cm'],
        'weight_kg': measurements['weight_kg'],
        'age': measurements['age'],
        'bust_cm': measurements['bust_cm'],
        'waist_cm': measurements['waist_cm'],
        'hip_cm': measurements['hip_cm'],
        'height_cm_was_missing': int(np.isnan(measurements['height_cm'])),
        'weight_kg_was_missing': int(np.isnan(measurements['weight_kg'])),
        'age_was_missing': int(np.isnan(measurements['age'])),
        'bust_cm_was_missing': int(np.isnan(measurements['bust_cm'])),
        'waist_cm_was_missing': int(np.isnan(measurements['waist_cm'])),
        'hip_cm_was_missing': int(np.isnan(measurements['hip_cm'])),
        'category': category,
        'size_label': norm_size
    }
    df_in = pd.DataFrame([row])
    
    X_proc = preprocessor.transform(df_in)
    probs = calibrated_model.predict_proba(X_proc)[0]
    
    # Balanced decision rule:
    # Because true prior is 72% fit, probability of tight or loose > 0.35 indicates substantial fit risk!
    p_tight = float(probs[0])
    p_fit = float(probs[1])
    p_loose = float(probs[2])
    
    if p_tight >= 0.35 and p_tight > p_loose:
        pred_class = 'tight'
    elif p_loose >= 0.35 and p_loose > p_tight:
        pred_class = 'loose'
    else:
        pred_class = classes[int(np.argmax(probs))]
        
    probs_dict = {
        'tight': round(p_tight, 4),
        'fit': round(p_fit, 4),
        'loose': round(p_loose, 4)
    }
    
    return {
        'fit_class': pred_class,
        'probabilities': probs_dict
    }

def predict_garment_dims(brand: str, category: str, size: str, extra: dict = None) -> dict:
    """
    Predict physical garment dimensions in cm from brand, category, and size.
    Outputs are strictly flagged as "estimated", never "verified".
    
    Args:
        brand: str (e.g. 'Levi\\'s', 'Abercrombie & Fitch', 'unknown')
        category: str (e.g. 'dress', 'top', 'bottoms', 'knitwear')
        size: str (e.g. 'S', 'M', 'L')
        extra: dict (optional)
        
    Returns:
        dict: {dims_cm: dict, interval: dict, "estimated": true}
    """
    model_dict = get_model_3()
    trained_models = model_dict['trained_models']
    
    brand_clean = str(brand).strip().lower() if brand else 'unknown'
    cat_clean = standardise_category(category)
    size_norm = normalise_size_label(size)
    if pd.isnull(size_norm):
        size_norm = 'M'  # Graceful fallback
        
    row = pd.DataFrame([{
        'brand': brand_clean,
        'category': cat_clean,
        'size_label': size_norm
    }])
    
    dims_cm = {}
    interval_cm = {}
    
    for dim_name, model_info in trained_models.items():
        pipe = model_info['pipeline']
        pred_val = float(pipe.predict(row)[0])
        pred_val = max(20.0, round(pred_val, 1))
        
        dims_cm[dim_name] = pred_val
        interval_cm[dim_name] = model_info['interval_cm']
        
    return {
        'dims_cm': dims_cm,
        'interval': interval_cm,
        'estimated': True
    }
