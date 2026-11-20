"""Unit tests for all 4 clothing category strategies, ease allowances, fabric stretch, and missing measurements."""

from app.services.recommendation_engine import (
    MensBottomsStrategy,
    MensTopsStrategy,
    RecommendationEngine,
    WomensBottomsStrategy,
    WomensDressesStrategy,
    WomensTopsStrategy,
)


def test_mens_tops_strategy_and_fit_preferences() -> None:
    """Verify MensTopsStrategy selects larger sizes for relaxed fit vs slim fit."""
    engine = RecommendationEngine()
    strategy = engine.get_strategy("mens_tops")
    assert isinstance(strategy, MensTopsStrategy)

    garment_rows = [
        {"size_label": "S", "chest_bust_cm": 100.0, "shoulder_cm": 44.0, "sleeve_cm": 63.5, "torso_cm": 70.0},
        {"size_label": "M", "chest_bust_cm": 107.0, "shoulder_cm": 46.5, "sleeve_cm": 65.0, "torso_cm": 72.0},
        {"size_label": "L", "chest_bust_cm": 114.0, "shoulder_cm": 48.5, "sleeve_cm": 66.5, "torso_cm": 74.0},
    ]
    body = {"chest_bust": 96.0, "shoulder": 44.5, "sleeve": 63.5, "torso": 68.5}

    slim_ranked, slim_exp = engine.recommend("mens_tops", body, garment_rows, fit_preference="slim")
    relaxed_ranked, relaxed_exp = engine.recommend("mens_tops", body, garment_rows, fit_preference="relaxed")

    assert slim_ranked[0].size_label == "S"
    assert relaxed_ranked[0].size_label in ("M", "L")
    assert slim_exp.strategy_name == "MensTopsStrategy"
    assert any("ease" in note.note for note in slim_exp.per_measurement_notes)


def test_womens_tops_strategy_with_underbust_and_stretch() -> None:
    """Verify WomensTopsStrategy evaluates bust, underbust, shoulder, sleeve and accounts for fabric stretch."""
    engine = RecommendationEngine()
    strategy = engine.get_strategy("womens_tops")
    assert isinstance(strategy, WomensTopsStrategy)

    garment_rows = [
        {"size_label": "S", "chest_bust_cm": 89.0, "underbust_cm": 75.0, "shoulder_cm": 39.0, "sleeve_cm": 59.0},
        {"size_label": "M", "chest_bust_cm": 95.0, "underbust_cm": 80.0, "shoulder_cm": 40.5, "sleeve_cm": 60.0},
    ]
    body = {"chest_bust": 88.0, "underbust": 74.0, "shoulder": 39.0, "sleeve": 58.5}

    ranked, explanation = engine.recommend(
        "womens_tops",
        body,
        garment_rows,
        fit_preference="regular",
        product_stretch_pct=8.0,
    )
    assert "underbust" in explanation.evaluated_measurements
    assert ranked[0].size_label in ("S", "M")
    assert explanation.fabric_stretch_pct == 8.0


def test_mens_bottoms_strategy() -> None:
    """Verify MensBottomsStrategy evaluates waist, hips, inseam, thigh, and rise."""
    engine = RecommendationEngine()
    strategy = engine.get_strategy("mens_bottoms")
    assert isinstance(strategy, MensBottomsStrategy)

    garment_rows = [
        {"size_label": "S", "waist_cm": 80.0, "hips_cm": 98.0, "inseam_cm": 79.0, "thigh_cm": 57.0, "rise_cm": 26.5},
        {"size_label": "M", "waist_cm": 87.0, "hips_cm": 105.0, "inseam_cm": 80.5, "thigh_cm": 61.0, "rise_cm": 27.5},
        {"size_label": "L", "waist_cm": 94.0, "hips_cm": 112.0, "inseam_cm": 81.5, "thigh_cm": 65.0, "rise_cm": 28.5},
    ]
    body = {"waist": 83.5, "hips": 98.0, "inseam": 80.0, "thigh": 56.0, "rise": 26.5}

    ranked, explanation = engine.recommend("mens_bottoms", body, garment_rows, fit_preference="regular")
    assert ranked[0].size_label == "M"
    assert explanation.strategy_name == "MensBottomsStrategy"


def test_womens_bottoms_strategy_and_missing_measurements_handling() -> None:
    """Verify WomensBottomsStrategy gracefully handles missing thigh/rise by reducing confidence and explaining why."""
    engine = RecommendationEngine()
    strategy = engine.get_strategy("womens_bottoms")
    assert isinstance(strategy, WomensBottomsStrategy)

    garment_rows = [
        {"size_label": "S", "waist_cm": 72.0, "hips_cm": 98.0, "inseam_cm": 75.0, "thigh_cm": 57.0, "rise_cm": 26.5},
        {"size_label": "M", "waist_cm": 76.0, "hips_cm": 103.0, "inseam_cm": 75.5, "thigh_cm": 60.0, "rise_cm": 27.0},
    ]
    full_body = {"waist": 72.0, "hips": 97.0, "inseam": 75.0, "thigh": 55.0, "rise": 26.0}
    partial_body = {"waist": 72.0, "hips": 97.0, "inseam": None, "thigh": None, "rise": None}

    full_ranked, full_exp = engine.recommend("womens_bottoms", full_body, garment_rows)
    partial_ranked, partial_exp = engine.recommend("womens_bottoms", partial_body, garment_rows)

    assert partial_ranked[0].confidence < full_ranked[0].confidence
    assert set(partial_exp.missing_measurements) == {"inseam", "thigh", "rise"}
    assert partial_exp.confidence_penalty_reason is not None
    assert "missing" in partial_exp.confidence_penalty_reason.lower()


def test_womens_dresses_strategy_with_optional_shoulder() -> None:
    """Verify WomensDressesStrategy works both with and without optional shoulder measurement."""
    engine = RecommendationEngine()
    strategy = engine.get_strategy("womens_dresses")
    assert isinstance(strategy, WomensDressesStrategy)

    garment_rows = [
        {"size_label": "XS", "chest_bust_cm": 84.0, "waist_cm": 67.0, "hips_cm": 92.0, "shoulder_cm": 37.5},
        {"size_label": "S", "chest_bust_cm": 89.0, "waist_cm": 72.0, "hips_cm": 97.0, "shoulder_cm": 39.0},
        {"size_label": "M", "chest_bust_cm": 95.0, "waist_cm": 78.0, "hips_cm": 103.0, "shoulder_cm": 40.5},
        {"size_label": "L", "chest_bust_cm": 102.0, "waist_cm": 85.0, "hips_cm": 110.0, "shoulder_cm": 42.0},
    ]
    body_with_shoulder = {"chest_bust": 91.0, "waist": 74.0, "hips": 99.0, "shoulder": 39.5}
    body_without_shoulder = {"chest_bust": 91.0, "waist": 74.0, "hips": 99.0, "shoulder": None}

    ranked_full, exp_full = engine.recommend("womens_dresses", body_with_shoulder, garment_rows, fit_preference="regular")
    ranked_opt, exp_opt = engine.recommend("womens_dresses", body_without_shoulder, garment_rows, fit_preference="regular")

    assert ranked_full[0].size_label == "M"
    assert ranked_opt[0].size_label == "M"
    assert exp_full.strategy_name == "WomensDressesStrategy"
    assert "shoulder" in exp_opt.missing_measurements
    assert set(exp_opt.evaluated_measurements) == {"chest_bust", "waist", "hips"}

