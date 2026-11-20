"""SQLAlchemy 2.0 ORM models for Brands, Categories, Products, SizeCharts, and GarmentMeasurements."""

from datetime import datetime, timezone
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.recommendation import RecommendationRecord


def utc_now() -> datetime:
    """Return current UTC timestamp."""
    return datetime.now(timezone.utc)


class Brand(Base):
    """Apparel brand metadata and supported domain information."""

    __tablename__ = "brands"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(150), unique=True, index=True, nullable=False)
    slug: Mapped[str] = mapped_column(String(150), unique=True, index=True, nullable=False)
    website_domain: Mapped[Optional[str]] = mapped_column(String(255), index=True, nullable=True)
    country: Mapped[Optional[str]] = mapped_column(String(80), nullable=True)
    sizing_system: Mapped[str] = mapped_column(String(50), default="US/International", nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        onupdate=utc_now,
        nullable=False,
    )

    products: Mapped[List["Product"]] = relationship(
        "Product",
        back_populates="brand",
        cascade="all, delete-orphan",
    )
    size_charts: Mapped[List["SizeChart"]] = relationship(
        "SizeChart",
        back_populates="brand",
        cascade="all, delete-orphan",
    )


class ClothingCategory(Base):
    """Clothing category (mens_tops, womens_tops, mens_bottoms, womens_bottoms)."""

    __tablename__ = "clothing_categories"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    code: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    gender: Mapped[str] = mapped_column(String(32), nullable=False)
    garment_group: Mapped[str] = mapped_column(String(32), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)

    products: Mapped[List["Product"]] = relationship("Product", back_populates="category")
    size_charts: Mapped[List["SizeChart"]] = relationship("SizeChart", back_populates="category")


class Product(Base):
    """Apparel product linked to a brand and clothing category."""

    __tablename__ = "products"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    brand_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("brands.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    category_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("clothing_categories.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    external_product_id: Mapped[Optional[str]] = mapped_column(String(150), index=True, nullable=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    product_url: Mapped[Optional[str]] = mapped_column(String(500), index=True, nullable=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    primary_fabric: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    fabric_composition: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    stretch_percentage: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    intended_fit: Mapped[str] = mapped_column(String(32), default="regular", nullable=False)
    available_sizes_csv: Mapped[str] = mapped_column(String(255), default="XS,S,M,L,XL,XXL", nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        onupdate=utc_now,
        nullable=False,
    )

    brand: Mapped["Brand"] = relationship("Brand", back_populates="products")
    category: Mapped["ClothingCategory"] = relationship("ClothingCategory", back_populates="products")
    size_charts: Mapped[List["SizeChart"]] = relationship(
        "SizeChart",
        back_populates="product",
        cascade="all, delete-orphan",
    )
    recommendations: Mapped[List["RecommendationRecord"]] = relationship(
        "RecommendationRecord",
        back_populates="product",
        cascade="all, delete-orphan",
    )

    @property
    def available_sizes(self) -> List[str]:
        """Return list of available size labels."""
        if not self.available_sizes_csv:
            return []
        return [s.strip() for s in self.available_sizes_csv.split(",") if s.strip()]

    @property
    def brand_name(self) -> Optional[str]:
        """Return the associated brand's display name."""
        return self.brand.name if self.brand else None

    @property
    def category_code(self) -> Optional[str]:
        """Return the associated clothing category code."""
        return self.category.code if self.category else None


class SizeChart(Base):
    """Size chart containing per-size garment dimensions, provenance, and verification status."""

    __tablename__ = "size_charts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    brand_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("brands.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    category_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("clothing_categories.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    product_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("products.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    source_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    data_source: Mapped[str] = mapped_column(
        String(150),
        default="brand_official_chart",
        nullable=False,
    )
    verification_status: Mapped[str] = mapped_column(
        String(32),
        default="estimated",
        nullable=False,
        index=True,
    )
    verified_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    verified_by_user_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        onupdate=utc_now,
        nullable=False,
    )

    brand: Mapped["Brand"] = relationship("Brand", back_populates="size_charts")
    category: Mapped["ClothingCategory"] = relationship("ClothingCategory", back_populates="size_charts")
    product: Mapped[Optional["Product"]] = relationship("Product", back_populates="size_charts")
    garment_measurements: Mapped[List["GarmentMeasurement"]] = relationship(
        "GarmentMeasurement",
        back_populates="size_chart",
        cascade="all, delete-orphan",
        order_by="GarmentMeasurement.size_order",
    )


class GarmentMeasurement(Base):
    """Garment dimensions in centimetres for a specific size in a SizeChart."""

    __tablename__ = "garment_measurements"
    __table_args__ = (
        UniqueConstraint("size_chart_id", "size_label", name="uq_size_chart_size_label"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    size_chart_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("size_charts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    size_label: Mapped[str] = mapped_column(String(32), nullable=False)
    size_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    chest_bust_cm: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    underbust_cm: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    shoulder_cm: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    sleeve_cm: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    torso_cm: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    waist_cm: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    hips_cm: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    inseam_cm: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    thigh_cm: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    rise_cm: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    stretch_percentage_override: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    data_source: Mapped[str] = mapped_column(String(150), default="brand_official_chart", nullable=False)
    verification_status: Mapped[str] = mapped_column(String(32), default="estimated", nullable=False)
    verified_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    verified_by_user_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        onupdate=utc_now,
        nullable=False,
    )

    size_chart: Mapped["SizeChart"] = relationship("SizeChart", back_populates="garment_measurements")
