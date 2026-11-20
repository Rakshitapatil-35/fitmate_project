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


class UserUpdateRequest(BaseModel):
    """Payload for updating a user's own profile or password."""

    full_name: Optional[str] = Field(default=None, min_length=2, max_length=120)
    email: Optional[EmailStr] = None
    password: Optional[str] = Field(default=None, min_length=8, max_length=128)

    @field_validator("password")
    @classmethod
    def validate_password_if_present(cls, value: Optional[str]) -> Optional[str]:
        if value is not None:
            if not (any(c.isalpha() for c in value) and any(c.isdigit() for c in value)):
                raise ValueError("Password must contain at least one letter and one number.")
        return value
