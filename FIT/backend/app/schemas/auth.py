"""Pydantic v2 schemas for Authentication (register, login, token refresh, logout)."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field, field_validator


class UserRegisterRequest(BaseModel):
    """Request payload for registering a new user account."""

    email: EmailStr
    full_name: str = Field(..., min_length=2, max_length=120)
    password: str = Field(..., min_length=8, max_length=128)

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, value: str) -> str:
        """Require at least one letter and one digit for password security."""
        has_letter = any(ch.isalpha() for ch in value)
        has_digit = any(ch.isdigit() for ch in value)
        if not (has_letter and has_digit):
            raise ValueError("Password must contain at least one letter and one number.")
        return value
