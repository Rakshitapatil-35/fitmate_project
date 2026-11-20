"""Admin-only management router: brands, categories, products, size charts, verification, ML logs, CSV export."""

from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import ConflictException, NotFoundException
from app.database import get_db
from app.dependencies import require_admin
from app.models.catalog import Brand, ClothingCategory, GarmentMeasurement, Product, SizeChart
from app.models.recommendation import PredictionLog
from app.models.user import User
from app.schemas.catalog import (
    BrandCreateRequest,
    BrandResponse,
    BrandUpdateRequest,
    CategoryCreateRequest,
    CategoryResponse,
    GarmentMeasurementResponse,
    GarmentMeasurementUpdateRequest,
    ProductCreateRequest,
    ProductResponse,
    ProductUpdateRequest,
    SizeChartCreateRequest,
    SizeChartResponse,
    VerificationUpdateRequest,
)
from app.schemas.recommendation import PredictionLogResponse
from app.services.feedback_service import export_labelled_training_csv

router = APIRouter(
    prefix="/admin",
    tags=["Admin Management"],
    dependencies=[Depends(require_admin)],
)


@router.post("/brands", response_model=BrandResponse, status_code=status.HTTP_201_CREATED)
async def admin_create_brand(
    payload: BrandCreateRequest,
    db: Session = Depends(get_db),
) -> Brand:
    """Create a new apparel brand (Admin only)."""
    existing = db.scalar(
        select(Brand).where((Brand.name == payload.name) | (Brand.slug == payload.slug))
    )
    if existing:
        raise ConflictException(f"Brand with name '{payload.name}' or slug '{payload.slug}' already exists.")

    brand = Brand(
        name=payload.name.strip(),
        slug=payload.slug.strip().lower(),
        website_domain=payload.website_domain.lower().strip() if payload.website_domain else None,
        country=payload.country,
        sizing_system=payload.sizing_system,
        description=payload.description,
        is_active=payload.is_active,
    )
    db.add(brand)
    db.commit()
    db.refresh(brand)
    return brand


@router.put("/brands/{brand_id}", response_model=BrandResponse)
async def admin_update_brand(
    brand_id: int,
    payload: BrandUpdateRequest,
    db: Session = Depends(get_db),
) -> Brand:
    """Edit an existing brand (Admin only)."""
    brand = db.get(Brand, brand_id)
    if brand is None:
        raise NotFoundException(f"Brand with id={brand_id} not found.")

    if payload.name is not None:
        brand.name = payload.name.strip()
    if payload.website_domain is not None:
        brand.website_domain = payload.website_domain.lower().strip()
    if payload.country is not None:
        brand.country = payload.country
    if payload.sizing_system is not None:
        brand.sizing_system = payload.sizing_system
    if payload.description is not None:
        brand.description = payload.description
    if payload.is_active is not None:
        brand.is_active = payload.is_active

    db.commit()
    db.refresh(brand)
    return brand


@router.post("/categories", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
async def admin_create_category(
    payload: CategoryCreateRequest,
    db: Session = Depends(get_db),
) -> ClothingCategory:
    """Create a clothing category (Admin only)."""
    existing = db.scalar(select(ClothingCategory).where(ClothingCategory.code == payload.code))
    if existing:
        raise ConflictException(f"Category '{payload.code}' already exists.")

    category = ClothingCategory(
        code=payload.code,
        name=payload.name.strip(),
        gender=payload.gender,
        garment_group=payload.garment_group.strip(),
        description=payload.description,
    )
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


@router.post("/products", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
async def admin_create_product(
    payload: ProductCreateRequest,
    db: Session = Depends(get_db),
) -> Product:
    """Add a new product with fabric and stretch metadata (Admin only)."""
    if db.get(Brand, payload.brand_id) is None:
        raise NotFoundException(f"Brand id={payload.brand_id} does not exist.")
    if db.get(ClothingCategory, payload.category_id) is None:
        raise NotFoundException(f"Category id={payload.category_id} does not exist.")

    product = Product(
        brand_id=payload.brand_id,
        category_id=payload.category_id,
        external_product_id=payload.external_product_id,
        name=payload.name.strip(),
        product_url=payload.product_url,
        description=payload.description,
        primary_fabric=payload.primary_fabric,
        fabric_composition=payload.fabric_composition,
        stretch_percentage=payload.stretch_percentage,
        intended_fit=payload.intended_fit,
        available_sizes_csv=",".join(s.strip() for s in payload.available_sizes if s.strip()),
        is_active=payload.is_active,
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


@router.put("/products/{product_id}", response_model=ProductResponse)
async def admin_update_product(
    product_id: int,
    payload: ProductUpdateRequest,
    db: Session = Depends(get_db),
) -> Product:
    """Update product details, fabric composition, or available sizes (Admin only)."""
    product = db.get(Product, product_id)
    if product is None:
        raise NotFoundException(f"Product with id={product_id} not found.")

    if payload.name is not None:
        product.name = payload.name.strip()
    if payload.external_product_id is not None:
        product.external_product_id = payload.external_product_id
    if payload.product_url is not None:
        product.product_url = payload.product_url
    if payload.description is not None:
        product.description = payload.description
    if payload.primary_fabric is not None:
        product.primary_fabric = payload.primary_fabric
    if payload.fabric_composition is not None:
        product.fabric_composition = payload.fabric_composition
    if payload.stretch_percentage is not None:
        product.stretch_percentage = payload.stretch_percentage
    if payload.intended_fit is not None:
        product.intended_fit = payload.intended_fit
    if payload.available_sizes is not None:
        product.available_sizes_csv = ",".join(s.strip() for s in payload.available_sizes if s.strip())
    if payload.is_active is not None:
        product.is_active = payload.is_active

    db.commit()
    db.refresh(product)
    return product


@router.post("/size-charts", response_model=SizeChartResponse, status_code=status.HTTP_201_CREATED)
async def admin_create_size_chart(
    payload: SizeChartCreateRequest,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> SizeChart:
    """Add a size chart with garment measurements per size and provenance tracking (Admin only)."""
    if db.get(Brand, payload.brand_id) is None:
        raise NotFoundException(f"Brand id={payload.brand_id} not found.")
    if db.get(ClothingCategory, payload.category_id) is None:
        raise NotFoundException(f"Category id={payload.category_id} not found.")
    if payload.product_id is not None and db.get(Product, payload.product_id) is None:
        raise NotFoundException(f"Product id={payload.product_id} not found.")

    now = datetime.now(timezone.utc)
    is_verified = payload.verification_status == "verified"

    chart = SizeChart(
        brand_id=payload.brand_id,
        category_id=payload.category_id,
        product_id=payload.product_id,
        name=payload.name.strip(),
        source_url=payload.source_url,
        data_source=payload.data_source,
        verification_status=payload.verification_status,
        verified_at=now if is_verified else None,
        verified_by_user_id=admin_user.id if is_verified else None,
        notes=payload.notes,
    )
    db.add(chart)
    db.flush()

    for idx, gm_in in enumerate(payload.measurements):
        gm_verified = gm_in.verification_status == "verified" or is_verified
        gm = GarmentMeasurement(
            size_chart_id=chart.id,
            size_label=gm_in.size_label.strip().upper(),
            size_order=gm_in.size_order if gm_in.size_order else idx,
            chest_bust_cm=gm_in.chest_bust_cm,
            underbust_cm=gm_in.underbust_cm,
            shoulder_cm=gm_in.shoulder_cm,
            sleeve_cm=gm_in.sleeve_cm,
            torso_cm=gm_in.torso_cm,
            waist_cm=gm_in.waist_cm,
            hips_cm=gm_in.hips_cm,
            inseam_cm=gm_in.inseam_cm,
            thigh_cm=gm_in.thigh_cm,
            rise_cm=gm_in.rise_cm,
            stretch_percentage_override=gm_in.stretch_percentage_override,
            data_source=gm_in.data_source or payload.data_source,
            verification_status="verified" if gm_verified else "estimated",
            verified_at=now if gm_verified else None,
            verified_by_user_id=admin_user.id if gm_verified else None,
        )
        db.add(gm)

    db.commit()
    db.refresh(chart)
    return chart


@router.patch("/size-charts/{size_chart_id}/verify", response_model=SizeChartResponse)
async def admin_verify_size_chart(
    size_chart_id: int,
    payload: VerificationUpdateRequest,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> SizeChart:
    """Mark a size chart and its measurements as verified or estimated, recording timestamp and admin ID."""
    chart = db.get(SizeChart, size_chart_id)
    if chart is None:
        raise NotFoundException(f"SizeChart with id={size_chart_id} not found.")

    now = datetime.now(timezone.utc)
    chart.verification_status = payload.verification_status
    if payload.data_source is not None:
        chart.data_source = payload.data_source
    if payload.notes is not None:
        chart.notes = payload.notes

    if payload.verification_status == "verified":
        chart.verified_at = now
        chart.verified_by_user_id = admin_user.id
    else:
        chart.verified_at = None
        chart.verified_by_user_id = None

    for gm in chart.garment_measurements:
        gm.verification_status = payload.verification_status
        gm.verified_at = chart.verified_at
        gm.verified_by_user_id = chart.verified_by_user_id
        if payload.data_source is not None:
            gm.data_source = payload.data_source

    db.commit()
    db.refresh(chart)
    return chart


@router.put("/garment-measurements/{measurement_id}", response_model=GarmentMeasurementResponse)
async def admin_update_garment_measurement(
    measurement_id: int,
    payload: GarmentMeasurementUpdateRequest,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> GarmentMeasurement:
    """Update garment measurements for a specific size and record data source / verification status."""
    gm = db.get(GarmentMeasurement, measurement_id)
    if gm is None:
        raise NotFoundException(f"GarmentMeasurement with id={measurement_id} not found.")

    dim_fields = [
        "chest_bust_cm",
        "underbust_cm",
        "shoulder_cm",
        "sleeve_cm",
        "torso_cm",
        "waist_cm",
        "hips_cm",
        "inseam_cm",
        "thigh_cm",
        "rise_cm",
        "stretch_percentage_override",
    ]
    for field in dim_fields:
        val = getattr(payload, field)
        if val is not None:
            setattr(gm, field, val)

    if payload.data_source is not None:
        gm.data_source = payload.data_source

    if payload.verification_status is not None:
        gm.verification_status = payload.verification_status
        if payload.verification_status == "verified":
            gm.verified_at = datetime.now(timezone.utc)
            gm.verified_by_user_id = admin_user.id
        else:
            gm.verified_at = None
            gm.verified_by_user_id = None

    db.commit()
    db.refresh(gm)
    return gm


@router.get("/prediction-logs", response_model=List[PredictionLogResponse])
async def admin_list_prediction_logs(
    limit: int = 50,
    db: Session = Depends(get_db),
) -> List[PredictionLog]:
    """Inspect recent ML prediction logs including model version, latency, and fallback invocations."""
    stmt = select(PredictionLog).order_by(PredictionLog.id.desc()).limit(limit)
    return list(db.scalars(stmt).all())


@router.get("/feedback/export-csv")
async def admin_export_feedback_training_csv(db: Session = Depends(get_db)) -> Response:
    """Export clean labelled feedback + measurement data as CSV for future ML model training."""
    csv_content = export_labelled_training_csv(db)
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="labelled_fit_training_data.csv"'},
    )
