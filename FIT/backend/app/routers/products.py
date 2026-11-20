"""Product catalog router: browse products, filter by brand/category, and inspect size charts."""

from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundException
from app.database import get_db
from app.models.catalog import ClothingCategory, Product, SizeChart
from app.schemas.catalog import ProductResponse, SizeChartResponse
from app.services.recommendation_service import resolve_size_chart_for_product

router = APIRouter(prefix="/products", tags=["Products"])


@router.get("", response_model=List[ProductResponse])
async def list_products(
    brand_id: Optional[int] = Query(default=None, gt=0),
    category_code: Optional[str] = Query(default=None),
    external_product_id: Optional[str] = Query(default=None),
    active_only: bool = True,
    db: Session = Depends(get_db),
) -> List[Product]:
    """List products with optional filtering by brand_id, category_code, or external_product_id."""
    stmt = select(Product).order_by(Product.id.asc())
    if active_only:
        stmt = stmt.where(Product.is_active.is_(True))
    if brand_id is not None:
        stmt = stmt.where(Product.brand_id == brand_id)
    if external_product_id is not None:
        stmt = stmt.where(Product.external_product_id == external_product_id)
    if category_code is not None:
        stmt = stmt.join(ClothingCategory, Product.category_id == ClothingCategory.id).where(
            ClothingCategory.code == category_code
        )
    return list(db.scalars(stmt).all())


@router.get("/{product_id}", response_model=ProductResponse)
async def get_product(product_id: int, db: Session = Depends(get_db)) -> Product:
    """Retrieve details for a single product by ID."""
    product = db.get(Product, product_id)
    if product is None:
        raise NotFoundException(f"Product with id={product_id} not found.")
    return product


@router.get("/{product_id}/size-chart", response_model=SizeChartResponse)
async def get_product_size_chart(product_id: int, db: Session = Depends(get_db)) -> SizeChart:
    """Retrieve the active size chart (product-specific or brand+category default) for a product."""
    product = db.get(Product, product_id)
    if product is None:
        raise NotFoundException(f"Product with id={product_id} not found.")
    return resolve_size_chart_for_product(db, product)
