"""Pydantic v2 schemas for User profile retrieval and management."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class UserResponse(BaseModel):
    """Publicly safe user profile representation."""

    id: int
    email: EmailStr
    full_name: str
    role: str
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
