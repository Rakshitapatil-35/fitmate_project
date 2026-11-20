"""Structured JSON-like logging configuration for the application."""

import json
import logging
import sys
from datetime import datetime, timezone
from typing import Any, Dict

from app.config import settings


class StructuredFormatter(logging.Formatter):
    """Format log records as structured JSON lines for production observability."""

    def format(self, record: logging.LogRecord) -> str:
        log_payload: Dict[str, Any] = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "line": record.lineno,
        }
        if hasattr(record, "extra_data") and isinstance(record.extra_data, dict):
            log_payload.update(record.extra_data)
        if record.exc_info:
            log_payload["exception"] = self.formatException(record.exc_info)
        return json.dumps(log_payload, default=str)


def setup_logging() -> logging.Logger:
    """Configure root and application loggers with structured formatting."""
    logger = logging.getLogger("size_recommendation")
    if logger.handlers:
        return logger

    level = getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO)
    logger.setLevel(level)

    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(level)
    handler.setFormatter(StructuredFormatter())
    logger.addHandler(handler)
    logger.propagate = False
    return logger


logger = setup_logging()
