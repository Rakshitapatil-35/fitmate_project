"""Pydantic v2 schemas for User profile retrieval and management."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator
