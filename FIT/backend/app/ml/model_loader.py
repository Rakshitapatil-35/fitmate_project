"""Model loader with caching and automatic fallback if artifact is missing or corrupt."""

from pathlib import Path
from typing import Any, Dict, Optional

import joblib

from app.config import settings
from app.core.logging import logger
from app.ml.train_stub import build_and_save_dummy_model
from app.ml.version import MODEL_VERSION


class ModelLoader:
    """Manages loading and caching the serialized ML model bundle."""

    def __init__(self, model_path: Optional[str] = None) -> None:
        self.model_path = Path(model_path or settings.ML_MODEL_PATH)
        self._bundle: Optional[Dict[str, Any]] = None

    def load(self, auto_create_if_missing: bool = True) -> Optional[Dict[str, Any]]:
        """Load the joblib model bundle from disk, optionally generating the stub artifact if missing."""
        if not settings.ML_ENABLED:
            logger.info("ML_ENABLED is false; skipping ML model load.")
            return None

        if self._bundle is not None:
            return self._bundle

        if not self.model_path.exists():
            if auto_create_if_missing:
                try:
                    logger.info(f"ML model not found at {self.model_path}; building initial stub artifact.")
                    build_and_save_dummy_model(self.model_path)
                except Exception as exc:
                    logger.error(f"Failed to generate stub ML artifact: {exc}")
                    return None
            else:
                logger.warning(f"ML model file does not exist at {self.model_path}")
                return None

        try:
            loaded = joblib.load(self.model_path)
            if not isinstance(loaded, dict) or "classifier" not in loaded:
                logger.error(f"Invalid ML artifact structure in {self.model_path}")
                return None
            self._bundle = loaded
            return self._bundle
        except Exception as exc:
            logger.error(f"Error loading ML model from {self.model_path}: {exc}")
            return None

    def get_version(self) -> str:
        """Return the loaded model version or fallback version tag."""
        if self._bundle and "model_version" in self._bundle:
            return str(self._bundle["model_version"])
        return f"{MODEL_VERSION}-unloaded"


default_model_loader = ModelLoader()
