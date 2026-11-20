"""Rule-based Size Recommendation Engine using the Strategy Pattern for 4 clothing categories."""

from abc import ABC, abstractmethod
import json
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from app.config import settings
from app.core.exceptions import AppException
from app.schemas.recommendation import (
    PerMeasurementFitNote,
    RankedSizeOption,
    RecommendationExplanation,
)

DISPLAY_LABELS: Dict[str, str] = {
    "chest_bust": "chest/bust",
    "underbust": "underbust",
    "shoulder": "shoulder",
    "sleeve": "sleeve",
    "torso": "torso",
    "waist": "waist",
    "hips": "hips",
    "inseam": "inseam",
    "thigh": "thigh",
    "rise": "rise",
}

STRETCH_SENSITIVE_DIMENSIONS = {"chest_bust", "underbust", "waist", "hips", "thigh"}


def load_ease_config(config_path: Optional[str] = None) -> Dict[str, Any]:
    """Load ease allowance and weight tables from JSON configuration file."""
    path = Path(config_path or settings.EASE_CONFIG_PATH)
    if not path.exists():
        # Fallback relative to this file if running from another directory
        alt_path = Path(__file__).parent / "ease_config.json"
        path = alt_path
    with path.open("r", encoding="utf-8") as fp:
        return json.load(fp)


class BaseRecommendationStrategy(ABC):
    """Abstract base strategy for category-specific garment vs. body comparison."""

    category_code: str
    strategy_name: str
    important_measurements: List[str]
    primary_anchor_measurement: str

    def __init__(self, category_config: Dict[str, Any]) -> None:
        self.weights: Dict[str, float] = category_config["weights"]
        self.ease_table: Dict[str, Dict[str, Dict[str, float]]] = category_config["ease_allowances_cm"]

    @abstractmethod
    def get_relevant_measurements(
        self,
        body_measurements: Dict[str, Optional[float]],
        garment_rows: List[Dict[str, Any]],
    ) -> List[str]:
        """Return ordered list of relevant measurements for this clothing category."""

    def compute_effective_garment_cm(
        self,
        dimension: str,
        raw_garment_cm: float,
        stretch_pct: float,
    ) -> float:
        """
        Account for fabric stretch on circumference dimensions.
        Up to 50% of total stretch percentage contributes usable comfort ease.
        """
        if dimension in STRETCH_SENSITIVE_DIMENSIONS and stretch_pct > 0:
            usable_stretch_factor = 1.0 + (stretch_pct * 0.5) / 100.0
            return round(raw_garment_cm * usable_stretch_factor, 2)
        return round(raw_garment_cm, 2)

    def score_dimension(
        self,
        dimension: str,
        body_cm: float,
        garment_cm: float,
        stretch_pct: float,
        fit_preference: str,
        weight: float,
    ) -> PerMeasurementFitNote:
        """Compare a single body measurement against a garment dimension with ease allowances."""
        pref_table = self.ease_table.get(fit_preference, self.ease_table["regular"])
        bounds = pref_table[dimension]
        min_ease = bounds["min"]
        ideal_ease = bounds["ideal"]
        max_ease = bounds["max"]
        tolerance = bounds["tolerance"]

        effective_garment_cm = self.compute_effective_garment_cm(dimension, garment_cm, stretch_pct)
        ease_cm = round(effective_garment_cm - body_cm, 2)
        label = DISPLAY_LABELS.get(dimension, dimension)

        if min_ease <= ease_cm <= max_ease:
            # Inside comfortable ease window: score between 82 and 100 based on closeness to ideal
            half_span = max((max_ease - min_ease) / 2.0, 1.0)
            dist_from_ideal = abs(ease_cm - ideal_ease)
            dimension_score = max(82.0, 100.0 - (dist_from_ideal / half_span) * 15.0)
            fit_status = "good_fit"
            note = f"{label}: {ease_cm:+.1f} cm of ease, comfortable ({fit_preference} fit target)"
        elif ease_cm < min_ease:
            deficit = min_ease - ease_cm
            # Tightness is penalized more sharply than looseness for comfort
            penalty = (deficit / tolerance) * 42.0
            dimension_score = max(0.0, 82.0 - penalty)
            fit_status = "too_tight"
            if ease_cm < 0:
                note = f"{label}: {ease_cm:+.1f} cm (garment smaller than body), constrictive/too tight"
            else:
                note = f"{label}: {ease_cm:+.1f} cm of ease, snugger than {fit_preference} target ({min_ease:+.1f} cm min)"
        else:
            excess = ease_cm - max_ease
            penalty = (excess / tolerance) * 32.0
            dimension_score = max(0.0, 82.0 - penalty)
            fit_status = "loose"
            note = f"{label}: {ease_cm:+.1f} cm of ease, roomier than {fit_preference} target ({max_ease:+.1f} cm max)"

        return PerMeasurementFitNote(
            measurement=dimension,
            body_cm=round(body_cm, 2),
            garment_cm=round(garment_cm, 2),
            effective_garment_cm=effective_garment_cm,
            ease_cm=ease_cm,
            target_ease_min_cm=min_ease,
            target_ease_ideal_cm=ideal_ease,
            target_ease_max_cm=max_ease,
            weight=round(weight, 3),
            dimension_score=round(dimension_score, 2),
            fit_status=fit_status,
            note=note,
        )

    def evaluate_size_chart(
        self,
        body_measurements: Dict[str, Optional[float]],
        garment_rows: List[Dict[str, Any]],
        fit_preference: str,
        product_stretch_pct: float,
        verification_status: str = "verified",
        top_n: int = 3,
    ) -> Tuple[List[RankedSizeOption], RecommendationExplanation]:
        """Evaluate all sizes in the garment chart and return top-N ranked options + explanation."""
        relevant_dims = self.get_relevant_measurements(body_measurements, garment_rows)

        evaluated_dims: List[str] = []
        missing_dims: List[str] = []
        for dim in relevant_dims:
            has_body = body_measurements.get(dim) is not None
            has_garment = any(row.get(f"{dim}_cm") is not None for row in garment_rows)
            if has_body and has_garment:
                evaluated_dims.append(dim)
            else:
                missing_dims.append(dim)

        if not evaluated_dims:
            raise AppException(
                message=(
                    f"Cannot compute recommendation for '{self.category_code}': none of the required "
                    f"measurements ({', '.join(relevant_dims)}) were present in both user profile and size chart."
                ),
                status_code=422,
                error_code="INSUFFICIENT_MEASUREMENTS",
            )

        # Calculate normalized weights across available dimensions
        raw_available_weight = sum(self.weights.get(dim, 0.1) for dim in evaluated_dims)
        total_configured_weight = sum(self.weights.get(dim, 0.1) for dim in relevant_dims)
        coverage_ratio = raw_available_weight / max(total_configured_weight, 0.01)

        # Base confidence from measurement coverage & chart verification
        base_confidence = round(min(0.98, 0.45 + 0.50 * coverage_ratio), 2)
        if verification_status != "verified":
            base_confidence = round(max(0.35, base_confidence - 0.08), 2)

        confidence_penalty_reason: Optional[str] = None
        if missing_dims:
            missing_labels = [DISPLAY_LABELS.get(m, m) for m in missing_dims]
            confidence_penalty_reason = (
                f"Confidence reduced because {len(missing_dims)} measurement(s) were missing "
                f"({', '.join(missing_labels)})."
            )
            if verification_status != "verified":
                confidence_penalty_reason += " Size chart is also marked as estimated."
        elif verification_status != "verified":
            confidence_penalty_reason = "Confidence slightly reduced because size chart is marked as estimated."

        ranked_options: List[RankedSizeOption] = []

        for row in garment_rows:
            size_label = str(row["size_label"])
            row_stretch = (
                float(row["stretch_percentage_override"])
                if row.get("stretch_percentage_override") is not None
                else float(product_stretch_pct or 0.0)
            )
            notes: List[PerMeasurementFitNote] = []
            weighted_sum = 0.0
            weight_used = 0.0

            for dim in evaluated_dims:
                body_val = body_measurements.get(dim)
                garment_val = row.get(f"{dim}_cm")
                if body_val is None or garment_val is None:
                    continue
                norm_weight = self.weights.get(dim, 0.1) / raw_available_weight
                fit_note = self.score_dimension(
                    dimension=dim,
                    body_cm=float(body_val),
                    garment_cm=float(garment_val),
                    stretch_pct=row_stretch,
                    fit_preference=fit_preference,
                    weight=norm_weight,
                )
                notes.append(fit_note)
                weighted_sum += fit_note.dimension_score * norm_weight
                weight_used += norm_weight

            final_score = round(weighted_sum / max(weight_used, 0.001), 2)

            # Determine overall fit_category for this size
            anchor_notes = [n for n in notes if n.measurement == self.primary_anchor_measurement]
            primary_note = anchor_notes[0] if anchor_notes else notes[0]
            tight_count = sum(1 for n in notes if n.fit_status == "too_tight")
            loose_count = sum(1 for n in notes if n.fit_status == "loose")

            if primary_note.fit_status == "too_tight" or tight_count > len(notes) / 2:
                overall_fit_cat = "too_tight"
            elif primary_note.fit_status == "loose" or loose_count > len(notes) / 2:
                overall_fit_cat = "loose"
            else:
                overall_fit_cat = "good_fit"

            # Scale confidence slightly by score quality
            option_confidence = round(
                max(0.25, min(0.99, base_confidence * (0.75 + 0.25 * (final_score / 100.0)))),
                2,
            )

            summary_note = (
                f"Size {size_label} scores {final_score:.1f}/100 ({overall_fit_cat.replace('_', ' ')}); "
                + "; ".join(n.note for n in notes)
            )

            ranked_options.append(
                RankedSizeOption(
                    size_label=size_label,
                    score=final_score,
                    fit_category=overall_fit_cat,  # type: ignore[arg-type]
                    confidence=option_confidence,
                    summary_note=summary_note,
                    measurement_notes=notes,
                )
            )

        ranked_options.sort(key=lambda item: item.score, reverse=True)
        top_ranked = ranked_options[:top_n]
        best = top_ranked[0]

        overall_summary = (
            f"Recommended size {best.size_label} ({best.fit_category.replace('_', ' ')}, "
            f"score {best.score:.1f}/100, confidence {best.confidence:.0%}) using {self.strategy_name} "
            f"for a '{fit_preference}' fit preference."
        )
        if confidence_penalty_reason:
            overall_summary += f" Note: {confidence_penalty_reason}"

        explanation = RecommendationExplanation(
            category_code=self.category_code,
            strategy_name=self.strategy_name,
            fit_preference=fit_preference,
            fabric_stretch_pct=round(float(product_stretch_pct or 0.0), 2),
            evaluated_measurements=evaluated_dims,
            missing_measurements=missing_dims,
            confidence_penalty_reason=confidence_penalty_reason,
            ml_prediction=None,
            overall_summary=overall_summary,
            per_measurement_notes=best.measurement_notes,
        )

        return top_ranked, explanation


class MensTopsStrategy(BaseRecommendationStrategy):
    """Strategy for Men's Tops: compares chest, shoulder, sleeve, and torso."""

    category_code = "mens_tops"
    strategy_name = "MensTopsStrategy"
    important_measurements = ["chest_bust", "shoulder", "sleeve", "torso"]
    primary_anchor_measurement = "chest_bust"

    def get_relevant_measurements(
        self,
        body_measurements: Dict[str, Optional[float]],
        garment_rows: List[Dict[str, Any]],
    ) -> List[str]:
        return list(self.important_measurements)


class WomensTopsStrategy(BaseRecommendationStrategy):
    """Strategy for Women's Tops: compares bust, underbust (where relevant), shoulder, and sleeve."""

    category_code = "womens_tops"
    strategy_name = "WomensTopsStrategy"
    important_measurements = ["chest_bust", "underbust", "shoulder", "sleeve"]
    primary_anchor_measurement = "chest_bust"

    def get_relevant_measurements(
        self,
        body_measurements: Dict[str, Optional[float]],
        garment_rows: List[Dict[str, Any]],
    ) -> List[str]:
        # Include underbust only when the garment chart or user profile tracks underbust
        chart_has_underbust = any(row.get("underbust_cm") is not None for row in garment_rows)
        if chart_has_underbust or body_measurements.get("underbust") is not None:
            return ["chest_bust", "underbust", "shoulder", "sleeve"]
        return ["chest_bust", "shoulder", "sleeve"]


class MensBottomsStrategy(BaseRecommendationStrategy):
    """Strategy for Men's Bottoms: compares waist, hips, inseam, thigh, and rise."""

    category_code = "mens_bottoms"
    strategy_name = "MensBottomsStrategy"
    important_measurements = ["waist", "hips", "inseam", "thigh", "rise"]
    primary_anchor_measurement = "waist"

    def get_relevant_measurements(
        self,
        body_measurements: Dict[str, Optional[float]],
        garment_rows: List[Dict[str, Any]],
    ) -> List[str]:
        return list(self.important_measurements)


class WomensBottomsStrategy(BaseRecommendationStrategy):
    """Strategy for Women's Bottoms: compares waist, hips, inseam, thigh, and rise."""

    category_code = "womens_bottoms"
    strategy_name = "WomensBottomsStrategy"
    important_measurements = ["waist", "hips", "inseam", "thigh", "rise"]
    primary_anchor_measurement = "hips"

    def get_relevant_measurements(
        self,
        body_measurements: Dict[str, Optional[float]],
        garment_rows: List[Dict[str, Any]],
    ) -> List[str]:
        return list(self.important_measurements)


class WomensDressesStrategy(BaseRecommendationStrategy):
    """Strategy for Women's Dresses: compares bust, waist, hips, and optional shoulder."""

    category_code = "womens_dresses"
    strategy_name = "WomensDressesStrategy"
    important_measurements = ["chest_bust", "waist", "hips", "shoulder"]
    primary_anchor_measurement = "waist"

    def get_relevant_measurements(
        self,
        body_measurements: Dict[str, Optional[float]],
        garment_rows: List[Dict[str, Any]],
    ) -> List[str]:
        return list(self.important_measurements)


STRATEGY_REGISTRY: Dict[str, type[BaseRecommendationStrategy]] = {
    "mens_tops": MensTopsStrategy,
    "womens_tops": WomensTopsStrategy,
    "mens_bottoms": MensBottomsStrategy,
    "womens_bottoms": WomensBottomsStrategy,
    "womens_dresses": WomensDressesStrategy,
}


class RecommendationEngine:
    """Facade selecting the appropriate category strategy and executing rule-based ranking."""

    def __init__(self, config_path: Optional[str] = None) -> None:
        self.config = load_ease_config(config_path)

    def get_strategy(self, category_code: str) -> BaseRecommendationStrategy:
        """Instantiate the concrete strategy for `category_code`."""
        strategy_cls = STRATEGY_REGISTRY.get(category_code)
        if strategy_cls is None or category_code not in self.config:
            raise AppException(
                message=f"Unsupported clothing category '{category_code}'.",
                status_code=400,
                error_code="UNSUPPORTED_CATEGORY",
            )
        return strategy_cls(self.config[category_code])

    def recommend(
        self,
        category_code: str,
        body_measurements: Dict[str, Optional[float]],
        garment_rows: List[Dict[str, Any]],
        fit_preference: str = "regular",
        product_stretch_pct: float = 0.0,
        verification_status: str = "verified",
        top_n: int = 3,
    ) -> Tuple[List[RankedSizeOption], RecommendationExplanation]:
        """Run the category strategy and return top-N ranked sizes and detailed explanation."""
        strategy = self.get_strategy(category_code)
        return strategy.evaluate_size_chart(
            body_measurements=body_measurements,
            garment_rows=garment_rows,
            fit_preference=fit_preference,
            product_stretch_pct=product_stretch_pct,
            verification_status=verification_status,
            top_n=top_n,
        )
