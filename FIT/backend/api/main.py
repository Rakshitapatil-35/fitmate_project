"""
FITMATE ML Platform - FastAPI Inference Service
Provides RESTful endpoints for clothing size prediction, fit recommendation,
and garment dimension estimation.
"""

from typing import Optional, Dict, Any, Union
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from src.predict import predict_size, predict_fit, predict_garment_dims, get_model_1, get_model_2, get_model_3

app = FastAPI(
    title="FITMATE ML API",
    description="Intelligent Clothing Size & Fit Recommendation ML Engine",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------
# Pydantic Schemas
# ---------------------------------------------------------

class BodyProfileSchema(BaseModel):
    height: Optional[Union[float, int, str]] = Field(None, description="Height in cm (e.g. 172) or string (e.g. 5' 8\", 5ft 8in)")
    weight: Optional[Union[float, int, str]] = Field(None, description="Weight in kg (e.g. 62) or string (e.g. 137 lbs)")
    age: Optional[Union[float, int]] = Field(None, description="Age in years (14-100)")
    bust: Optional[Union[float, int, str]] = Field(None, description="Bust measurement in cm or bra size (e.g. 34d, 36c)")
    waist: Optional[Union[float, int, str]] = Field(None, description="Waist measurement in cm or inches")
    hip: Optional[Union[float, int, str]] = Field(None, description="Hip measurement in cm or inches")
    fit_preference: Optional[str] = Field("fit", description="User fit preference: tight, fit, or loose")

class ProductSchema(BaseModel):
    category: Optional[str] = Field("dress", description="Product category: dress, top, bottoms, outerwear, knitwear")
    brand: Optional[str] = Field("unknown", description="Brand name")

class SizePredictionRequest(BaseModel):
    profile: BodyProfileSchema
    product: Optional[ProductSchema] = ProductSchema()

class SizePredictionResponse(BaseModel):
    size: str
    probabilities: Dict[str, float]
    confidence: float

class GarmentItemSchema(BaseModel):
    category: Optional[str] = Field("top", description="Garment category: dress, top, bottoms, outerwear, knitwear")
    size: Union[str, int, float] = Field(..., description="Garment size label (e.g. XS, S, M, L, XL, or numeric size 8, 12)")
    brand: Optional[str] = Field("unknown", description="Brand name")

class FitPredictionRequest(BaseModel):
    profile: BodyProfileSchema
    garment: GarmentItemSchema

class FitPredictionResponse(BaseModel):
    fit_class: str
    probabilities: Dict[str, float]

class GarmentDimensionsRequest(BaseModel):
    brand: Optional[str] = Field("unknown", description="Brand name")
    category: str = Field(..., description="Garment category: dress, top, bottoms, outerwear, knitwear")
    size: str = Field(..., description="Garment size label: XS, S, M, L, XL, XXL, XXXL")
    extra: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Additional optional product attributes")

class GarmentDimensionsResponse(BaseModel):
    dims_cm: Dict[str, float]
    interval: Dict[str, float]
    estimated: bool

# ---------------------------------------------------------
# Endpoints
# ---------------------------------------------------------

@app.get("/health")
async def health_check():
    """Service health probe and model loading verification."""
    try:
        get_model_1()
        get_model_2()
        get_model_3()
        models_ready = True
    except Exception as e:
        models_ready = False
        
    return {
        "status": "ok" if models_ready else "degraded",
        "service": "FITMATE ML API",
        "version": "1.0.0",
        "models_loaded": models_ready
    }

@app.post("/predict/size", response_model=SizePredictionResponse)
async def api_predict_size(req: SizePredictionRequest):
    """
    Model 1: Predict standard ordinal size (XXS..XXXL) from user body measurements
    and product category/fit preference.
    """
    try:
        profile_dict = req.profile.model_dump()
        product_dict = req.product.model_dump() if req.product else {}
        result = predict_size(profile_dict, product_dict)
        return result
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference error: {str(e)}")

@app.post("/predict/fit", response_model=FitPredictionResponse)
async def api_predict_fit(req: FitPredictionRequest):
    """
    Model 2: Predict fit recommendation class (tight / fit / loose) and calibrated probabilities
    for a chosen garment size and body measurements.
    """
    try:
        profile_dict = req.profile.model_dump()
        garment_dict = req.garment.model_dump()
        result = predict_fit(profile_dict, garment_dict)
        return result
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference error: {str(e)}")

@app.post("/predict/garment", response_model=GarmentDimensionsResponse)
async def api_predict_garment(req: GarmentDimensionsRequest):
    """
    Model 3: Predict estimated physical garment dimensions in cm (bust, waist, length, inseam)
    with 80% prediction intervals. Outputs are always flagged as estimated.
    """
    try:
        result = predict_garment_dims(
            brand=req.brand,
            category=req.category,
            size=req.size,
            extra=req.extra
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference error: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api.main:app", host="0.0.0.0", port=8000, reload=False)
