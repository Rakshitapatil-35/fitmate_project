"""Model version and metadata constants for the ML subsystem."""

MODEL_NAME: str = "size-fit-rf-classifier"
MODEL_VERSION: str = "1.0.0-sklearn"
ALLOWED_FIT_CATEGORIES = {"too_tight", "good_fit", "loose"}
STANDARD_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "28", "30", "32", "34", "36", "38"]
