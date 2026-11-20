"""Export all SQLAlchemy ORM models so Alembic and Base.metadata discover them."""

from app.models.catalog import Brand, ClothingCategory, GarmentMeasurement, Product, SizeChart
from app.models.feedback import FitFeedback
from app.models.measurement import BodyMeasurementProfile
from app.models.recommendation import PredictionLog, RecommendationRecord
from app.models.user import TokenBlacklist, User

__all__ = [
    "User",
    "TokenBlacklist",
    "BodyMeasurementProfile",
    "Brand",
    "ClothingCategory",
    "Product",
    "SizeChart",
    "GarmentMeasurement",
    "RecommendationRecord",
    "PredictionLog",
    "FitFeedback",
]
