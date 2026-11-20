"""Public/User router for browsing brands, clothing categories, and brand size charts."""

from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundException
from app.database import get_db
from app.models.catalog import Brand, ClothingCategory, SizeChart
from app.schemas.catalog import BrandResponse, CategoryResponse, SizeChartResponse

router = APIRouter(prefix="/brands", tags=["Brands & Categories"])


@router.get("", response_model=List[BrandResponse])
async def list_brands(
    active_only: bool = True,
    db: Session = Depends(get_db),
) -> List[Brand]:
    """List all supported apparel brands."""
    stmt = select(Brand).order_by(Brand.name.asc())
    if active_only:
        stmt = stmt.where(Brand.is_active.is_(True))
    return list(db.scalars(stmt).all())


@router.get("/categories", response_model=List[CategoryResponse])
async def list_categories(db: Session = Depends(get_db)) -> List[ClothingCategory]:
    """List all supported clothing categories (mens_tops, womens_tops, mens_bottoms, womens_bottoms)."""
    stmt = select(ClothingCategory).order_by(ClothingCategory.id.asc())
    return list(db.scalars(stmt).all())


@router.get("/{brand_id}", response_model=BrandResponse)
async def get_brand(brand_id: int, db: Session = Depends(get_db)) -> Brand:
    """Retrieve details for a specific brand by ID."""
    brand = db.get(Brand, brand_id)
    if brand is None:
        raise NotFoundException(f"Brand with id={brand_id} not found.")
    return brand


@router.get("/{brand_id}/size-charts", response_model=List[SizeChartResponse])
async def list_brand_size_charts(brand_id: int, db: Session = Depends(get_db)) -> List[SizeChart]:
    """Retrieve all size charts and garment measurements associated with a brand."""
    brand = db.get(Brand, brand_id)
    if brand is None:
        raise NotFoundException(f"Brand with id={brand_id} not found.")
    stmt = select(SizeChart).where(SizeChart.brand_id == brand_id).order_by(SizeChart.id.asc())
    return list(db.scalars(stmt).all())
