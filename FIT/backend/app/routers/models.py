"""
Router exposing all 5 FITMATE AI models and model health/readiness status:
  - GET  /api/v1/models/status
  - POST /api/v1/predict/size         (Model 1: Size Prediction)
  - POST /api/v1/predict/fit          (Model 2: Fit Recommendation)
  - POST /api/v1/predict/garment-dims (Model 3: Garment Dimensions)
  - POST /api/v1/predict/body-shape   (Model 4: Body Shape Clustering)
  - POST /api/v1/predict/fit-risk     (Model 5: Return Risk Classifier)
"""

from typing import Any, Dict, Optional, Union
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from app.services.model_service import default_model_service

router = APIRouter(prefix="", tags=["AI Model Services"])


# ---------------------------------------------------------------------------
# Pydantic Schemas for Model Endpoints
# ---------------------------------------------------------------------------

class BodyProfileInput(BaseModel):
    height: Optional[Union[float, int, str]] = Field(None, description="Height (cm, '5ft 8in', or 172)")
    weight: Optional[Union[float, int, str]] = Field(None, description="Weight (kg, '140 lbs', or 65)")
    age: Optional[Union[float, int, str]] = Field(None, description="Age in years")
    bust: Optional[Union[float, int, str]] = Field(None, description="Bust measurement or bra size (e.g. 34d, 90cm)")
    waist: Optional[Union[float, int, str]] = Field(None, description="Waist measurement (cm or inches)")
    hip: Optional[Union[float, int, str]] = Field(None, description="Hip measurement (cm or inches)")
    hips: Optional[Union[float, int, str]] = Field(None, description="Alias for hip")
    fit_preference: Optional[str] = Field("fit", description="tight, fit, or loose")


class ProductInput(BaseModel):
    category: Optional[str] = Field("top", description="Garment category: top, bottoms, dress, knitwear, outerwear")
    brand: Optional[str] = Field("FITMATE", description="Brand name")


class SizePredictRequest(BaseModel):
    profile: BodyProfileInput
    product: Optional[ProductInput] = Field(default_factory=ProductInput)


class GarmentItemInput(BaseModel):
    category: Optional[str] = Field("top", description="Garment category")
    size: Union[str, int, float] = Field(..., description="Garment size label (e.g. 'M', 'L', '8')")
    brand: Optional[str] = Field("FITMATE", description="Brand name")


class FitPredictRequest(BaseModel):
    profile: BodyProfileInput
    garment: GarmentItemInput


class GarmentDimsRequest(BaseModel):
    brand: Optional[str] = Field("FITMATE", description="Brand name")
    category: str = Field(..., description="Category (top, bottoms, dress, knitwear, outerwear)")
    size: str = Field(..., description="Size label (XS..XXXL)")
    extra: Optional[Dict[str, Any]] = Field(default_factory=dict)


class BodyShapePredictRequest(BaseModel):
    gender: str = Field(default="female", description="'female' / 'women' or 'male' / 'men'")
    height_cm: float = Field(..., gt=100, lt=250, description="Height in centimetres")
    weight_kg: float = Field(..., gt=25, lt=250, description="Weight in kilograms")
    waist_cm: float = Field(..., gt=40, lt=220, description="Waist in centimetres")


class FitRiskPredictRequest(BaseModel):
    size: float = Field(default=8.0, description="Numeric size (e.g. 2, 4, 6, 8, 10, 12)")
    rating: float = Field(default=4.0, ge=1.0, le=5.0, description="User satisfaction rating")
    height_cm: float = Field(default=168.0, gt=100, lt=250, description="Height in cm")
    weight_kg: float = Field(default=62.0, gt=25, lt=250, description="Weight in kg")
    waist_cm: float = Field(default=72.0, gt=40, lt=220, description="Waist in cm")
    hips_cm: float = Field(default=96.0, gt=40, lt=220, description="Hips in cm")
    category: str = Field(default="dress", description="Garment category")
    bust_band: float = Field(default=34.0, description="Band size (e.g. 32, 34, 36)")
    cup_size: str = Field(default="c", description="Cup size (e.g. 'a', 'b', 'c', 'd')")
    body_type: str = Field(default="hourglass", description="Body type (e.g. 'hourglass', 'petite', 'athletic')")
    size_deviation: float = Field(default=0.0, description="Deviation from expected size")


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/models/status")
async def get_models_status() -> Dict[str, Any]:
    """Report status of all 5 ML models and their sample-prediction checks."""
    try:
        return default_model_service.get_models_status()
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error checking model status: {exc}",
        )


@router.post("/predict/size")
async def api_predict_size(req: SizePredictRequest) -> Dict[str, Any]:
    """Model 1: Predict standard size (XS..XXXL) from body profile."""
    try:
        profile_dict = req.profile.model_dump()
        product_dict = req.product.model_dump() if req.product else {}
        return default_model_service.predict_size(profile_dict, product_dict)
    except ValueError as val_err:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(val_err))
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Inference error: {exc}")


@router.post("/predict/fit")
async def api_predict_fit(req: FitPredictRequest) -> Dict[str, Any]:
    """Model 2: Predict fit recommendation (tight / fit / loose) and probabilities."""
    try:
        profile_dict = req.profile.model_dump()
        garment_dict = req.garment.model_dump()
        return default_model_service.predict_fit(profile_dict, garment_dict)
    except ValueError as val_err:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(val_err))
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Inference error: {exc}")


@router.post("/predict/garment-dims")
@router.post("/predict/garment")
async def api_predict_garment_dims(req: GarmentDimsRequest) -> Dict[str, Any]:
    """Model 3: Predict estimated physical garment dimensions in cm (bust, waist, length, inseam)."""
    try:
        return default_model_service.predict_garment_dims(
            brand=req.brand or "FITMATE",
            category=req.category,
            size=req.size,
            extra=req.extra,
        )
    except ValueError as val_err:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(val_err))
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Inference error: {exc}")


@router.post("/predict/body-shape")
async def api_predict_body_shape(req: BodyShapePredictRequest) -> Dict[str, Any]:
    """Model 4: Classify user anthropometric body shape / archetype using NHANES KMeans."""
    try:
        return default_model_service.predict_body_shape(
            gender=req.gender,
            height_cm=req.height_cm,
            weight_kg=req.weight_kg,
            waist_cm=req.waist_cm,
        )
    except ValueError as val_err:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(val_err))
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Inference error: {exc}")


@router.post("/predict/fit-risk")
async def api_predict_fit_risk(req: FitRiskPredictRequest) -> Dict[str, Any]:
    """Model 5: Predict return risk and fit satisfaction using CalibratedClassifier."""
    try:
        return default_model_service.predict_fit_risk(
            size=req.size,
            rating=req.rating,
            height_cm=req.height_cm,
            weight_kg=req.weight_kg,
            waist_cm=req.waist_cm,
            hips_cm=req.hips_cm,
            category=req.category,
            bust_band=req.bust_band,
            cup_size=req.cup_size,
            body_type=req.body_type,
            size_deviation=req.size_deviation,
        )
    except ValueError as val_err:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(val_err))
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Inference error: {exc}")
