"""
Browser Extension REST API support router.
Handles product/domain detection, retrieves authenticated user's measurements, returns size
recommendations, and responds gracefully (HTTP 200 with {"supported": false, ...}) for
unsupported websites without ever raising a 500 error.
"""

from typing import Optional
from urllib.parse import urlparse

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.catalog import Brand, ClothingCategory, Product
from app.models.measurement import BodyMeasurementProfile
from app.models.user import User
from app.schemas.extension import (
    ExtensionLookupResponse,
    ExtensionProductLookupRequest,
    ExtensionRecommendRequest,
    ExtensionRecommendResponse,
)
from app.services.recommendation_service import generate_and_save_recommendation

router = APIRouter(prefix="/extension", tags=["Browser Extension API"])


def extract_clean_domain(url_str: str) -> Optional[str]:
    """Parse hostname from URL, stripping leading 'www.'; returns None if unparseable."""
    try:
        candidate = url_str.strip()
        if "://" not in candidate:
            candidate = "https://" + candidate
        parsed = urlparse(candidate)
        host = (parsed.hostname or "").lower().strip()
        if host.startswith("www."):
            host = host[4:]
        return host or None
    except Exception:
        return None


def match_product_and_brand(
    db: Session,
    page_url: str,
    external_product_id: Optional[str] = None,
    product_id: Optional[int] = None,
    brand_name: Optional[str] = None,
    product_title: Optional[str] = None,
) -> tuple[Optional[Brand], Optional[Product], Optional[str]]:
    """Attempt to resolve a supported Brand and Product from extension page metadata."""
    domain = extract_clean_domain(page_url)

    if product_id is not None:
        prod = db.get(Product, product_id)
        if prod and prod.is_active:
            brand = db.get(Brand, prod.brand_id)
            return brand, prod, domain

    # 1. Exact product URL match
    prod_by_url = db.scalar(
        select(Product).where(Product.product_url == page_url.strip(), Product.is_active.is_(True))
    )
    if prod_by_url:
        brand = db.get(Brand, prod_by_url.brand_id)
        return brand, prod_by_url, domain

    # 2. Match by external_product_id
    if external_product_id:
        prod_by_ext = db.scalar(
            select(Product).where(
                Product.external_product_id == external_product_id.strip(),
                Product.is_active.is_(True),
            )
        )
        if prod_by_ext:
            brand = db.get(Brand, prod_by_ext.brand_id)
            return brand, prod_by_ext, domain

    # 3. Match brand by website_domain or brand_name
    matched_brand: Optional[Brand] = None
    if domain:
        matched_brand = db.scalar(
            select(Brand).where(
                func.lower(Brand.website_domain) == domain,
                Brand.is_active.is_(True),
            )
        )
    if matched_brand is None and brand_name:
        matched_brand = db.scalar(
            select(Brand).where(
                func.lower(Brand.name) == brand_name.strip().lower(),
                Brand.is_active.is_(True),
            )
        )

    if matched_brand is not None:
        # Try matching product within brand by title or fallback to first active product on brand
        if product_title:
            prod_by_title = db.scalar(
                select(Product).where(
                    Product.brand_id == matched_brand.id,
                    func.lower(Product.name) == product_title.strip().lower(),
                    Product.is_active.is_(True),
                )
            )
            if prod_by_title:
                return matched_brand, prod_by_title, domain

        first_brand_prod = db.scalar(
            select(Product)
            .where(Product.brand_id == matched_brand.id, Product.is_active.is_(True))
            .order_by(Product.id.asc())
        )
        return matched_brand, first_brand_prod, domain

    return None, None, domain


@router.post("/lookup", response_model=ExtensionLookupResponse)
async def extension_lookup_product(
    payload: ExtensionProductLookupRequest,
    db: Session = Depends(get_db),
) -> ExtensionLookupResponse:
    """
    Identify whether a website/product URL is supported by the backend catalog.
    Never returns 500 on unknown or unsupported URLs.
    """
    brand, product, domain = match_product_and_brand(
        db=db,
        page_url=payload.page_url,
        external_product_id=payload.external_product_id,
        brand_name=payload.brand_name,
        product_title=payload.product_title,
    )

    if brand is None or product is None:
        return ExtensionLookupResponse(
            supported=False,
            message=(
                f"Website or product at '{domain or payload.page_url}' is not yet supported in our "
                "verified size catalog."
            ),
            domain=domain,
        )

    category = db.get(ClothingCategory, product.category_id)
    return ExtensionLookupResponse(
        supported=True,
        message=f"Supported product '{product.name}' matched under brand '{brand.name}'.",
        domain=domain,
        brand_id=brand.id,
        brand_name=brand.name,
        product_id=product.id,
        product_name=product.name,
        category_code=category.code if category else None,
        available_sizes=product.available_sizes,
    )


@router.post("/recommend", response_model=ExtensionRecommendResponse)
async def extension_get_recommendation(
    payload: ExtensionRecommendRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ExtensionRecommendResponse:
    """
    Receive product details from the browser extension, retrieve the authenticated user's
    saved body measurements, and return the recommended size.
    Handles unsupported websites and missing measurements gracefully.
    """
    brand, product, domain = match_product_and_brand(
        db=db,
        page_url=payload.page_url,
        external_product_id=payload.external_product_id,
        product_id=payload.product_id,
        brand_name=payload.brand_name,
    )

    if brand is None or product is None:
        return ExtensionRecommendResponse(
            supported=False,
            message=(
                f"Website or product at '{domain or payload.page_url}' is not supported. "
                "Cannot generate a size recommendation for this page."
            ),
            user_measurement_profile_id=None,
            recommendation=None,
        )

    # Retrieve user's measurement profile
    profile: Optional[BodyMeasurementProfile] = None
    if payload.measurement_profile_id is not None:
        profile = db.get(BodyMeasurementProfile, payload.measurement_profile_id)
        if profile is None or profile.user_id != current_user.id:
            return ExtensionRecommendResponse(
                supported=True,
                message=f"Measurement profile id={payload.measurement_profile_id} was not found for your account.",
                user_measurement_profile_id=None,
                recommendation=None,
            )
    else:
        profile = db.scalar(
            select(BodyMeasurementProfile)
            .where(BodyMeasurementProfile.user_id == current_user.id)
            .order_by(BodyMeasurementProfile.is_default.desc(), BodyMeasurementProfile.updated_at.desc())
        )
        if profile is None:
            return ExtensionRecommendResponse(
                supported=True,
                message="Please save your body measurements in your profile before requesting extension recommendations.",
                user_measurement_profile_id=None,
                recommendation=None,
            )

    try:
        recommendation = generate_and_save_recommendation(
            db=db,
            user_id=current_user.id,
            product_id=product.id,
            measurement_profile_id=profile.id,
            fit_preference_override=payload.fit_preference_override,
            top_n=3,
            use_ml=True,
        )
        return ExtensionRecommendResponse(
            supported=True,
            message=f"Recommended size {recommendation.recommended_size} for {product.name}.",
            user_measurement_profile_id=profile.id,
            recommendation=recommendation,
        )
    except Exception as exc:
        return ExtensionRecommendResponse(
            supported=True,
            message=f"Product is supported, but recommendation could not be computed: {exc}",
            user_measurement_profile_id=profile.id,
            recommendation=None,
        )
