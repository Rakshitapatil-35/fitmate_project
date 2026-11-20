"""
Database seed script populating an admin user, a demo user with body measurement profiles,
all 4 clothing categories, sample brands, products, verified size charts, and the initial ML model.
Run via: `python seed.py`
"""

from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

import app.models  # noqa: F401
from app.core.security import hash_password
from app.database import Base, SessionLocal, engine
from app.ml.train_stub import build_and_save_dummy_model
from app.models.catalog import Brand, ClothingCategory, GarmentMeasurement, Product, SizeChart
from app.models.measurement import BodyMeasurementProfile
from app.models.user import User


from pathlib import Path
from app.config import settings


def seed_database(db: Session) -> dict[str, int]:
    """Idempotently seed initial data into the SQLite database."""
    Base.metadata.create_all(bind=engine)

    # Ensure additive columns exist on existing SQLite body_measurement_profiles table
    try:
        from sqlalchemy import inspect, text

        insp = inspect(db.get_bind())
        if "body_measurement_profiles" in insp.get_table_names():
            existing_cols = {c["name"] for c in insp.get_columns("body_measurement_profiles")}
            for col_name, col_type in [
                ("body_shape", "VARCHAR(120)"),
                ("target_category", "VARCHAR(64)"),
                ("fit_style", "VARCHAR(64)"),
                ("history_json", "TEXT"),
            ]:
                if col_name not in existing_cols:
                    db.execute(text(f"ALTER TABLE body_measurement_profiles ADD COLUMN {col_name} {col_type}"))
            db.commit()
    except Exception:
        db.rollback()

    if not Path(settings.ML_MODEL_PATH).exists():
        build_and_save_dummy_model()

    now = datetime.now(timezone.utc)

    # 1. Users (Admin + Standard User)
    admin_user = db.scalar(select(User).where(User.email == "admin@sizerec.example.com"))
    if admin_user is None:
        admin_user = User(
            email="admin@sizerec.example.com",
            full_name="Platform Admin",
            hashed_password=hash_password("AdminPass123"),
            role="admin",
            is_active=True,
        )
        db.add(admin_user)

    demo_user = db.scalar(select(User).where(User.email == "alex@sizerec.example.com"))
    if demo_user is None:
        demo_user = User(
            email="alex@sizerec.example.com",
            full_name="Alex Rivera",
            hashed_password=hash_password("UserPass123"),
            role="user",
            is_active=True,
        )
        db.add(demo_user)

    db.flush()

    # 2. Demo User Measurement Profiles
    existing_profiles = db.scalars(
        select(BodyMeasurementProfile).where(BodyMeasurementProfile.user_id == demo_user.id)
    ).all()
    if not existing_profiles:
        db.add_all(
            [
                BodyMeasurementProfile(
                    user_id=demo_user.id,
                    profile_name="Alex Men's Regular Profile",
                    gender="male",
                    fit_preference="regular",
                    original_unit="cm",
                    is_default=True,
                    chest_bust_cm=98.0,
                    shoulder_cm=45.0,
                    sleeve_cm=64.0,
                    torso_cm=68.0,
                    waist_cm=84.0,
                    hips_cm=99.0,
                    inseam_cm=80.0,
                    thigh_cm=57.0,
                    rise_cm=27.0,
                    height_cm=179.0,
                    weight_kg=76.0,
                ),
                BodyMeasurementProfile(
                    user_id=demo_user.id,
                    profile_name="Alex Women's Tailored Profile",
                    gender="female",
                    fit_preference="regular",
                    original_unit="cm",
                    is_default=False,
                    chest_bust_cm=90.0,
                    underbust_cm=76.0,
                    shoulder_cm=39.5,
                    sleeve_cm=59.0,
                    torso_cm=60.0,
                    waist_cm=72.0,
                    hips_cm=97.0,
                    inseam_cm=75.0,
                    thigh_cm=55.0,
                    rise_cm=26.0,
                    height_cm=167.0,
                    weight_kg=61.0,
                ),
            ]
        )

    # 3. Clothing Categories (5 supported categories including womens_dresses)
    categories_seed = [
        ("mens_tops", "Men's Tops", "male", "tops", "Shirts, tees, sweaters, and jackets for men"),
        ("womens_tops", "Women's Tops", "female", "tops", "Blouses, tops, knitwear, and bodysuits for women"),
        ("mens_bottoms", "Men's Bottoms", "male", "bottoms", "Trousers, jeans, chinos, and shorts for men"),
        ("womens_bottoms", "Women's Bottoms", "female", "bottoms", "Jeans, trousers, and skirts for women"),
        ("womens_dresses", "Women's Dresses", "female", "dresses", "Bodycon, A-line, Maxi, and Shift dresses for women"),
    ]
    cat_map: dict[str, ClothingCategory] = {}
    for code, name, gender, group, desc in categories_seed:
        cat = db.scalar(select(ClothingCategory).where(ClothingCategory.code == code))
        if cat is None:
            cat = ClothingCategory(
                code=code,
                name=name,
                gender=gender,
                garment_group=group,
                description=desc,
            )
            db.add(cat)
            db.flush()
        cat_map[code] = cat

    # 4. Brands
    brands_seed = [
        (
            "NordicThread",
            "nordic-thread",
            "nordicthread.example.com",
            "Sweden",
            "EU/International",
            "Minimalist Scandinavian essentials with verified garment measurements.",
        ),
        (
            "AuraAtelier",
            "aura-atelier",
            "auraatelier.example.com",
            "United States",
            "US/International",
            "Contemporary stretch-woven womenswear and tailored separates.",
        ),
        (
            "Zara",
            "zara",
            "zara.com",
            "Spain",
            "EU/International",
            "Contemporary fashion tailoring with modern fitted silhouettes.",
        ),
        (
            "H&M",
            "hm",
            "hm.com",
            "Sweden",
            "EU/US Standard",
            "Everyday casual basics and seasonal collections.",
        ),
        (
            "Levi's",
            "levis",
            "levi.com",
            "United States",
            "US Waist/Inseam",
            "Heritage denim cuts and rugged American apparel.",
        ),
        (
            "Uniqlo",
            "uniqlo",
            "uniqlo.com",
            "Japan",
            "Asian/Global Comfort",
            "LifeWear essentials engineered for all-day comfort and stretch.",
        ),
        (
            "Mango",
            "mango",
            "mango.com",
            "Spain",
            "EU/International",
            "Mediterranean aesthetic tailored with crisp silhouettes.",
        ),
    ]
    brand_map: dict[str, Brand] = {}
    for b_name, b_slug, b_domain, b_country, b_sys, b_desc in brands_seed:
        b_obj = db.scalar(select(Brand).where(Brand.slug == b_slug))
        if b_obj is None:
            b_obj = Brand(
                name=b_name,
                slug=b_slug,
                website_domain=b_domain,
                country=b_country,
                sizing_system=b_sys,
                description=b_desc,
                is_active=True,
            )
            db.add(b_obj)
            db.flush()
        brand_map[b_slug] = b_obj

    # 5. Products & Size Charts for all 4 categories
    existing_products = db.scalars(select(Product)).all()
    if not existing_products:
        # Product 1: Men's Top
        p_mens_top = Product(
            brand_id=brand_map["nordic-thread"].id,
            category_id=cat_map["mens_tops"].id,
            external_product_id="NT-MT-101",
            name="Nordic Oxford Button-Down Shirt",
            product_url="https://nordicthread.example.com/products/oxford-shirt-101",
            description="Crisp organic cotton oxford shirt with regular tailoring.",
            primary_fabric="Organic Cotton",
            fabric_composition="98% Organic Cotton, 2% Elastane",
            stretch_percentage=2.0,
            intended_fit="regular",
            available_sizes_csv="XS,S,M,L,XL,XXL",
            is_active=True,
        )
        # Product 2: Women's Top
        p_womens_top = Product(
            brand_id=brand_map["aura-atelier"].id,
            category_id=cat_map["womens_tops"].id,
            external_product_id="AA-WT-201",
            name="Aura Sculpted Ribbed Knit Top",
            product_url="https://auraatelier.example.com/products/sculpted-rib-top-201",
            description="Fitted ribbed knit top with contoured bust and underbust support.",
            primary_fabric="Modal Rib Knit",
            fabric_composition="92% Tencel Modal, 8% Spandex",
            stretch_percentage=8.0,
            intended_fit="regular",
            available_sizes_csv="XS,S,M,L,XL",
            is_active=True,
        )
        # Product 3: Men's Bottom
        p_mens_bottom = Product(
            brand_id=brand_map["nordic-thread"].id,
            category_id=cat_map["mens_bottoms"].id,
            external_product_id="NT-MB-301",
            name="Nordic Stretch Twill Chino",
            product_url="https://nordicthread.example.com/products/stretch-chino-301",
            description="Everyday tapered chino with comfortable 4% stretch.",
            primary_fabric="Stretch Cotton Twill",
            fabric_composition="96% Cotton, 4% Elastane",
            stretch_percentage=4.0,
            intended_fit="regular",
            available_sizes_csv="S,M,L,XL",
            is_active=True,
        )
        # Product 4: Women's Bottom
        p_womens_bottom = Product(
            brand_id=brand_map["aura-atelier"].id,
            category_id=cat_map["womens_bottoms"].id,
            external_product_id="AA-WB-401",
            name="Aura High-Rise Wide Leg Jean",
            product_url="https://auraatelier.example.com/products/high-rise-jean-401",
            description="High-rise denim tailored through waist and hips.",
            primary_fabric="Comfort Stretch Denim",
            fabric_composition="95% Cotton, 4% Polyester, 1% Elastane",
            stretch_percentage=3.0,
            intended_fit="regular",
            available_sizes_csv="XS,S,M,L,XL",
            is_active=True,
        )
        db.add_all([p_mens_top, p_womens_top, p_mens_bottom, p_womens_bottom])
        db.flush()

        # Size Chart 1: Men's Tops
        sc_mt = SizeChart(
            brand_id=brand_map["nordic-thread"].id,
            category_id=cat_map["mens_tops"].id,
            product_id=p_mens_top.id,
            name="NordicThread Men's Shirts Official Chart",
            source_url="https://nordicthread.example.com/size-guide/mens-tops",
            data_source="brand_official_garment_spec",
            verification_status="verified",
            verified_at=now,
            verified_by_user_id=admin_user.id,
            notes="Verified flat-lay garment measurements converted to 3D circumference.",
        )
        db.add(sc_mt)
        db.flush()
        mt_rows = [
            ("XS", 1, 94.0, 42.5, 62.0, 68.0),
            ("S", 2, 100.0, 44.0, 63.5, 70.0),
            ("M", 3, 106.5, 46.5, 65.0, 72.0),
            ("L", 4, 113.0, 48.5, 66.5, 74.0),
            ("XL", 5, 120.0, 50.5, 68.0, 76.0),
            ("XXL", 6, 127.0, 52.5, 69.5, 78.0),
        ]
        for label, order, chest, shoulder, sleeve, torso in mt_rows:
            db.add(
                GarmentMeasurement(
                    size_chart_id=sc_mt.id,
                    size_label=label,
                    size_order=order,
                    chest_bust_cm=chest,
                    shoulder_cm=shoulder,
                    sleeve_cm=sleeve,
                    torso_cm=torso,
                    data_source="brand_official_garment_spec",
                    verification_status="verified",
                    verified_at=now,
                    verified_by_user_id=admin_user.id,
                )
            )

        # Size Chart 2: Women's Tops
        sc_wt = SizeChart(
            brand_id=brand_map["aura-atelier"].id,
            category_id=cat_map["womens_tops"].id,
            product_id=p_womens_top.id,
            name="AuraAtelier Women's Knit Tops Chart",
            source_url="https://auraatelier.example.com/size-guide/womens-tops",
            data_source="brand_tech_pack_2026",
            verification_status="verified",
            verified_at=now,
            verified_by_user_id=admin_user.id,
        )
        db.add(sc_wt)
        db.flush()
        wt_rows = [
            ("XS", 1, 84.0, 70.0, 37.5, 58.0),
            ("S", 2, 89.0, 75.0, 39.0, 59.0),
            ("M", 3, 94.0, 80.0, 40.5, 60.0),
            ("L", 4, 100.0, 86.0, 42.0, 61.0),
            ("XL", 5, 107.0, 92.0, 43.5, 62.0),
        ]
        for label, order, bust, underbust, shoulder, sleeve in wt_rows:
            db.add(
                GarmentMeasurement(
                    size_chart_id=sc_wt.id,
                    size_label=label,
                    size_order=order,
                    chest_bust_cm=bust,
                    underbust_cm=underbust,
                    shoulder_cm=shoulder,
                    sleeve_cm=sleeve,
                    data_source="brand_tech_pack_2026",
                    verification_status="verified",
                    verified_at=now,
                    verified_by_user_id=admin_user.id,
                )
            )

        # Size Chart 3: Men's Bottoms
        sc_mb = SizeChart(
            brand_id=brand_map["nordic-thread"].id,
            category_id=cat_map["mens_bottoms"].id,
            product_id=p_mens_bottom.id,
            name="NordicThread Men's Chinos Chart",
            source_url="https://nordicthread.example.com/size-guide/mens-bottoms",
            data_source="brand_official_garment_spec",
            verification_status="verified",
            verified_at=now,
            verified_by_user_id=admin_user.id,
        )
        db.add(sc_mb)
        db.flush()
        mb_rows = [
            ("S", 1, 80.0, 98.0, 79.0, 57.0, 26.5),
            ("M", 2, 86.0, 104.0, 80.5, 61.0, 27.5),
            ("L", 3, 92.0, 110.0, 81.5, 64.5, 28.5),
            ("XL", 4, 99.0, 117.0, 82.5, 68.0, 29.5),
        ]
        for label, order, waist, hips, inseam, thigh, rise in mb_rows:
            db.add(
                GarmentMeasurement(
                    size_chart_id=sc_mb.id,
                    size_label=label,
                    size_order=order,
                    waist_cm=waist,
                    hips_cm=hips,
                    inseam_cm=inseam,
                    thigh_cm=thigh,
                    rise_cm=rise,
                    data_source="brand_official_garment_spec",
                    verification_status="verified",
                    verified_at=now,
                    verified_by_user_id=admin_user.id,
                )
            )

        # Size Chart 4: Women's Bottoms
        sc_wb = SizeChart(
            brand_id=brand_map["aura-atelier"].id,
            category_id=cat_map["womens_bottoms"].id,
            product_id=p_womens_bottom.id,
            name="AuraAtelier Women's Denim Chart",
            source_url="https://auraatelier.example.com/size-guide/womens-bottoms",
            data_source="brand_tech_pack_2026",
            verification_status="verified",
            verified_at=now,
            verified_by_user_id=admin_user.id,
        )
        db.add(sc_wb)
        db.flush()
        wb_rows = [
            ("XS", 1, 67.0, 93.0, 74.5, 54.0, 25.5),
            ("S", 2, 72.0, 98.0, 75.0, 57.0, 26.5),
            ("M", 3, 75.0, 102.5, 75.5, 59.5, 27.0),
            ("L", 4, 81.0, 108.5, 76.0, 63.0, 28.0),
            ("XL", 5, 88.0, 115.0, 76.5, 67.0, 29.0),
        ]
        for label, order, waist, hips, inseam, thigh, rise in wb_rows:
            db.add(
                GarmentMeasurement(
                    size_chart_id=sc_wb.id,
                    size_label=label,
                    size_order=order,
                    waist_cm=waist,
                    hips_cm=hips,
                    inseam_cm=inseam,
                    thigh_cm=thigh,
                    rise_cm=rise,
                    data_source="brand_tech_pack_2026",
                    verification_status="verified",
                    verified_at=now,
                    verified_by_user_id=admin_user.id,
                )
            )

    db.commit()

    # 6. Additional featured retail products & verified size charts (Zara, H&M, Levi's, Uniqlo, Mango)
    extra_products_seed = [
        (
            "zara",
            "womens_tops",
            "ZR-TOP-101",
            "White Poplin Fit Shirt",
            "https://zara.com/sample/poplin-shirt",
            "Tailored crisp organic poplin button-down with clean collar.",
            "Organic Cotton",
            "98% Cotton, 2% Elastane",
            2.0,
            "regular",
            "XS,S,M,L,XL",
            [
                ("XS", 1, 84.0, 70.0, 37.5, 58.0, None, None, None, None, None),
                ("S", 2, 89.0, 75.0, 39.0, 59.0, None, None, None, None, None),
                ("M", 3, 95.0, 80.0, 40.5, 60.0, None, None, None, None, None),
                ("L", 4, 102.0, 86.0, 42.0, 61.0, None, None, None, None, None),
                ("XL", 5, 110.0, 92.0, 43.5, 62.0, None, None, None, None, None),
            ],
        ),
        (
            "zara",
            "womens_tops",
            "ZR-LNN-202",
            "Oversized Linen Resort Shirt",
            "https://zara.com/sample/linen-shirt",
            "Airy pure linen weave with dropped shoulders and breezy drape.",
            "Linen",
            "100% French Flax Linen",
            0.0,
            "relaxed",
            "XS,S,M,L,XL",
            [
                ("XS", 1, 88.0, 74.0, 39.0, 58.5, None, None, None, None, None),
                ("S", 2, 93.0, 78.0, 40.5, 59.5, None, None, None, None, None),
                ("M", 3, 99.0, 83.0, 42.0, 60.5, None, None, None, None, None),
                ("L", 4, 105.0, 89.0, 43.5, 61.5, None, None, None, None, None),
                ("XL", 5, 112.0, 95.0, 45.0, 62.5, None, None, None, None, None),
            ],
        ),
        (
            "hm",
            "womens_tops",
            "HM-TOP-105",
            "Everyday Relaxed Cotton Blouse",
            "https://hm.com/sample/cotton-blouse",
            "Soft woven cotton blouse with standard EU comfort ease.",
            "Cotton",
            "100% Organic Cotton",
            1.5,
            "regular",
            "XS,S,M,L,XL",
            [
                ("XS", 1, 85.0, 71.0, 38.0, 58.0, None, None, None, None, None),
                ("S", 2, 90.0, 76.0, 39.5, 59.0, None, None, None, None, None),
                ("M", 3, 96.0, 81.0, 41.0, 60.0, None, None, None, None, None),
                ("L", 4, 103.0, 87.0, 42.5, 61.0, None, None, None, None, None),
                ("XL", 5, 111.0, 93.0, 44.0, 62.0, None, None, None, None, None),
            ],
        ),
        (
            "levis",
            "womens_bottoms",
            "LV-JNS-501",
            "501 Original Fit Jeans",
            "https://levi.com/sample/501-jeans",
            "Timeless straight leg silhouette crafted from durable cotton twill.",
            "Denim",
            "99% Cotton, 1% Elastane",
            1.5,
            "regular",
            "XS,S,M,L,XL",
            [
                ("XS", 1, None, None, None, None, 67.0, 93.0, 74.5, 54.0, 25.5),
                ("S", 2, None, None, None, None, 72.0, 98.0, 75.0, 57.0, 26.5),
                ("M", 3, None, None, None, None, 76.0, 103.0, 75.5, 59.5, 27.0),
                ("L", 4, None, None, None, None, 82.0, 109.0, 76.0, 63.0, 28.0),
                ("XL", 5, None, None, None, None, 89.0, 116.0, 76.5, 67.0, 29.0),
            ],
        ),
        (
            "uniqlo",
            "womens_tops",
            "UQ-TEE-301",
            "Supima Cotton Crewneck Tee",
            "https://uniqlo.com/sample/supima-tee",
            "Silky smooth 100% premium long-staple Supima cotton with comfort ease.",
            "Supima Cotton",
            "100% Cotton",
            4.0,
            "relaxed",
            "XS,S,M,L,XL,XXL",
            [
                ("XS", 1, 86.0, 72.0, 38.0, 57.5, None, None, None, None, None),
                ("S", 2, 91.0, 77.0, 39.5, 58.5, None, None, None, None, None),
                ("M", 3, 97.0, 82.0, 41.0, 59.5, None, None, None, None, None),
                ("L", 4, 104.0, 88.0, 42.5, 60.5, None, None, None, None, None),
                ("XL", 5, 111.0, 94.0, 44.0, 61.5, None, None, None, None, None),
                ("XXL", 6, 118.0, 100.0, 45.5, 62.5, None, None, None, None, None),
            ],
        ),
        (
            "mango",
            "womens_tops",
            "MG-TOP-405",
            "Tailored Linen Blend Shirt",
            "https://mango.com/sample/linen-blend-shirt",
            "Mediterranean structured silhouette with slightly tapered waist contour.",
            "Linen Blend",
            "70% Linen, 28% Viscose, 2% Elastane",
            2.0,
            "slim",
            "XS,S,M,L,XL",
            [
                ("XS", 1, 83.0, 69.0, 37.0, 57.5, None, None, None, None, None),
                ("S", 2, 88.0, 74.0, 38.5, 58.5, None, None, None, None, None),
                ("M", 3, 93.5, 79.0, 40.0, 59.5, None, None, None, None, None),
                ("L", 4, 99.5, 85.0, 41.5, 60.5, None, None, None, None, None),
                ("XL", 5, 106.5, 91.0, 43.0, 61.5, None, None, None, None, None),
            ],
        ),
        (
            "zara",
            "womens_dresses",
            "ZR-DRS-501",
            "Satin Midi A-Line Dress",
            "https://zara.com/sample/satin-midi-dress",
            "Fluid A-line midi dress with fitted bodice and flared skirt.",
            "Satin Viscose",
            "97% Viscose, 3% Elastane",
            3.0,
            "regular",
            "XS,S,M,L,XL",
            [
                ("XS", 1, 83.0, 69.0, 37.0, 57.0, 65.0, 91.0, None, None, None),
                ("S", 2, 88.0, 74.0, 38.5, 58.0, 70.0, 96.0, None, None, None),
                ("M", 3, 94.0, 79.0, 40.0, 59.0, 75.0, 102.0, None, None, None),
                ("L", 4, 101.0, 85.0, 41.5, 60.0, 81.0, 108.0, None, None, None),
                ("XL", 5, 108.0, 91.0, 43.0, 61.0, 88.0, 115.0, None, None, None),
            ],
        ),
        (
            "mango",
            "womens_dresses",
            "MG-DRS-502",
            "Ribbed Knit Bodycon Midi Dress",
            "https://mango.com/sample/ribbed-bodycon-dress",
            "Contouring knit dress engineered with stretch comfort.",
            "Stretch Knit",
            "92% Viscose, 8% Elastane",
            8.0,
            "slim",
            "XS,S,M,L,XL",
            [
                ("XS", 1, 81.0, 68.0, 36.5, 57.0, 63.0, 89.0, None, None, None),
                ("S", 2, 86.0, 73.0, 38.0, 58.0, 68.0, 94.0, None, None, None),
                ("M", 3, 92.0, 78.0, 39.5, 59.0, 73.0, 100.0, None, None, None),
                ("L", 4, 98.5, 84.0, 41.0, 60.0, 79.5, 106.5, None, None, None),
                ("XL", 5, 105.5, 90.0, 42.5, 61.0, 86.5, 113.5, None, None, None),
            ],
        ),
        (
            "uniqlo",
            "mens_tops",
            "UQ-TOP-601",
            "Supima Cotton Crewneck T-Shirt",
            "https://uniqlo.com/sample/mens-tshirt",
            "Classic crew-neck t-shirt in smooth long-staple Supima cotton.",
            "Supima Cotton",
            "100% Cotton",
            4.0,
            "regular",
            "XS,S,M,L,XL",
            [
                ("XS", 1, 92.0, None, 42.5, 20.5, 84.0, None, None, None, None),
                ("S", 2, 98.0, None, 44.0, 21.5, 90.0, None, None, None, None),
                ("M", 3, 105.0, None, 46.0, 22.5, 97.0, None, None, None, None),
                ("L", 4, 112.0, None, 48.0, 23.5, 104.0, None, None, None, None),
                ("XL", 5, 120.0, None, 50.0, 24.5, 112.0, None, None, None, None),
            ],
        ),
        (
            "hm",
            "womens_tops",
            "HM-TOP-602",
            "Heavyweight French Terry Sweatshirt",
            "https://hm.com/sample/womens-sweatshirt",
            "Relaxed crewneck sweatshirt with soft brushed interior.",
            "Cotton Fleece",
            "85% Cotton, 15% Polyester",
            4.0,
            "relaxed",
            "XS,S,M,L,XL",
            [
                ("XS", 1, 90.0, None, 40.0, 58.0, 76.0, None, None, None, None),
                ("S", 2, 95.0, None, 41.5, 59.0, 81.0, None, None, None, None),
                ("M", 3, 101.0, None, 43.0, 60.0, 87.0, None, None, None, None),
                ("L", 4, 108.0, None, 44.5, 61.0, 94.0, None, None, None, None),
                ("XL", 5, 115.0, None, 46.0, 62.0, 101.0, None, None, None, None),
            ],
        ),
        (
            "zara",
            "mens_tops",
            "ZR-TOP-603",
            "Structured Twill Overshirt Jacket",
            "https://zara.com/sample/mens-jacket",
            "Tailored structured jacket engineered for clean layering over tees and shirts.",
            "Cotton Twill",
            "100% Cotton",
            0.0,
            "regular",
            "XS,S,M,L,XL",
            [
                ("XS", 1, 94.0, None, 43.5, 62.0, 88.0, None, None, None, None),
                ("S", 2, 100.0, None, 45.0, 63.5, 94.0, None, None, None, None),
                ("M", 3, 107.0, None, 47.0, 65.0, 101.0, None, None, None, None),
                ("L", 4, 114.0, None, 49.0, 66.5, 108.0, None, None, None, None),
                ("XL", 5, 122.0, None, 51.0, 68.0, 116.0, None, None, None, None),
            ],
        ),
        (
            "aura-atelier",
            "womens_tops",
            "AA-TOP-604",
            "Ivory Embroidered Cotton Kurta",
            "https://auraatelier.example.com/womens-kurta",
            "Breathable long-line cotton kurta with subtle tonal embroidery and relaxed ease.",
            "Combed Cotton",
            "100% Cotton",
            0.0,
            "relaxed",
            "XS,S,M,L,XL",
            [
                ("XS", 1, 86.0, None, 37.5, 57.0, 74.0, None, None, None, None),
                ("S", 2, 91.0, None, 39.0, 58.0, 79.0, None, None, None, None),
                ("M", 3, 97.0, None, 40.5, 59.0, 85.0, None, None, None, None),
                ("L", 4, 104.0, None, 42.0, 60.0, 92.0, None, None, None, None),
                ("XL", 5, 112.0, None, 43.5, 61.0, 100.0, None, None, None, None),
            ],
        ),
        (
            "levis",
            "mens_bottoms",
            "LV-BTM-605",
            "Utility Relaxed Cargo Pants",
            "https://levi.com/sample/mens-cargo",
            "Relaxed utility cargo pants with bellows pockets and comfortable thigh ease.",
            "Ripstop Cotton",
            "98% Cotton, 2% Elastane",
            2.0,
            "relaxed",
            "XS,S,M,L,XL",
            [
                ("XS", 1, None, None, None, None, 74.0, 94.0, 77.0, 56.0, 26.5),
                ("S", 2, None, None, None, None, 80.0, 100.0, 78.0, 59.0, 27.5),
                ("M", 3, None, None, None, None, 87.0, 106.0, 79.5, 62.5, 28.5),
                ("L", 4, None, None, None, None, 94.0, 113.0, 81.0, 66.0, 29.5),
                ("XL", 5, None, None, None, None, 102.0, 120.0, 82.0, 69.5, 30.5),
            ],
        ),
        (
            "nordic-thread",
            "womens_bottoms",
            "NT-BTM-606",
            "Tapered Knit Track Pants",
            "https://nordicthread.example.com/womens-trackpants",
            "Tapered lounge track pants with stretch waistband and elastic ankle cuffs.",
            "Organic Loopback Jersey",
            "94% Cotton, 6% Elastane",
            6.0,
            "relaxed",
            "XS,S,M,L,XL",
            [
                ("XS", 1, None, None, None, None, 65.0, 92.0, 73.0, 54.0, 26.0),
                ("S", 2, None, None, None, None, 70.0, 97.0, 74.0, 57.0, 26.5),
                ("M", 3, None, None, None, None, 76.0, 103.0, 75.0, 60.5, 27.5),
                ("L", 4, None, None, None, None, 83.0, 110.0, 76.0, 64.0, 28.5),
                ("XL", 5, None, None, None, None, 91.0, 117.0, 76.5, 67.5, 29.5),
            ],
        ),
        (
            "uniqlo",
            "mens_bottoms",
            "UQ-BTM-607",
            "Tailored Chino Shorts",
            "https://uniqlo.com/sample/mens-shorts",
            "Knee-length tailored chino shorts with subtle stretch for warm-weather comfort.",
            "Stretch Chino Twill",
            "98% Cotton, 2% Elastane",
            2.0,
            "regular",
            "XS,S,M,L,XL",
            [
                ("XS", 1, None, None, None, None, 74.0, 93.0, 24.0, 55.0, 26.0),
                ("S", 2, None, None, None, None, 80.0, 99.0, 25.0, 58.0, 27.0),
                ("M", 3, None, None, None, None, 87.0, 105.0, 26.0, 61.5, 28.0),
                ("L", 4, None, None, None, None, 94.0, 112.0, 27.0, 65.0, 29.0),
                ("XL", 5, None, None, None, None, 102.0, 119.0, 28.0, 68.5, 30.0),
            ],
        ),
        (
            "zara",
            "womens_dresses",
            "ZR-DRS-608",
            "Tailored Wide-Leg Ivory Jumpsuit",
            "https://zara.com/sample/womens-jumpsuit",
            "Tailored wide-leg jumpsuit with defined waist and structured bodice.",
            "Crepe Blend",
            "96% Polyester, 4% Elastane",
            2.0,
            "regular",
            "XS,S,M,L,XL",
            [
                ("XS", 1, 83.0, 69.0, 37.0, 57.0, 65.0, 91.0, 75.0, None, None),
                ("S", 2, 88.0, 74.0, 38.5, 58.0, 70.0, 96.0, 75.5, None, None),
                ("M", 3, 94.0, 79.0, 40.0, 59.0, 75.0, 102.0, 76.0, None, None),
                ("L", 4, 101.0, 85.0, 41.5, 60.0, 81.0, 108.0, 76.5, None, None),
                ("XL", 5, 108.0, 91.0, 43.0, 61.0, 88.0, 115.0, 77.0, None, None),
            ],
        ),
    ]

    for (
        b_slug,
        c_code,
        ext_id,
        p_name,
        p_url,
        p_desc,
        p_fab,
        p_comp,
        p_stretch,
        p_fit,
        p_sizes,
        chart_rows,
    ) in extra_products_seed:
        existing_p = db.scalar(select(Product).where(Product.external_product_id == ext_id))
        if existing_p is None and b_slug in brand_map and c_code in cat_map:
            new_p = Product(
                brand_id=brand_map[b_slug].id,
                category_id=cat_map[c_code].id,
                external_product_id=ext_id,
                name=p_name,
                product_url=p_url,
                description=p_desc,
                primary_fabric=p_fab,
                fabric_composition=p_comp,
                stretch_percentage=p_stretch,
                intended_fit=p_fit,
                available_sizes_csv=p_sizes,
                is_active=True,
            )
            db.add(new_p)
            db.flush()

            new_sc = SizeChart(
                brand_id=brand_map[b_slug].id,
                category_id=cat_map[c_code].id,
                product_id=new_p.id,
                name=f"{brand_map[b_slug].name} {p_name} Official Chart",
                source_url=p_url,
                data_source="brand_official_garment_spec",
                verification_status="verified",
                verified_at=now,
                verified_by_user_id=admin_user.id,
            )
            db.add(new_sc)
            db.flush()

            for (
                s_lbl,
                s_ord,
                chest,
                underbust,
                shoulder,
                sleeve,
                waist,
                hips,
                inseam,
                thigh,
                rise,
            ) in chart_rows:
                db.add(
                    GarmentMeasurement(
                        size_chart_id=new_sc.id,
                        size_label=s_lbl,
                        size_order=s_ord,
                        chest_bust_cm=chest,
                        underbust_cm=underbust,
                        shoulder_cm=shoulder,
                        sleeve_cm=sleeve,
                        waist_cm=waist,
                        hips_cm=hips,
                        inseam_cm=inseam,
                        thigh_cm=thigh,
                        rise_cm=rise,
                        data_source="brand_official_garment_spec",
                        verification_status="verified",
                        verified_at=now,
                        verified_by_user_id=admin_user.id,
                    )
                )

    db.commit()

    # Idempotently migrate any existing bottoms profiles with fit_style='Slim' -> 'Skinny'
    from app.services.catalog_styles import migrate_bottoms_slim_to_skinny

    migrated_profiles = migrate_bottoms_slim_to_skinny(db)

    return {
        "users": len(db.scalars(select(User)).all()),
        "brands": len(db.scalars(select(Brand)).all()),
        "categories": len(db.scalars(select(ClothingCategory)).all()),
        "products": len(db.scalars(select(Product)).all()),
        "size_charts": len(db.scalars(select(SizeChart)).all()),
        "migrated_bottoms_slim": migrated_profiles,
    }


if __name__ == "__main__":
    with SessionLocal() as session:
        counts = seed_database(session)
        print("Database seeded successfully:", counts)
