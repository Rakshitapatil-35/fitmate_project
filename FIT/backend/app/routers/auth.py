"""Authentication router: user registration, login, token refresh, and logout."""

from datetime import datetime, timezone
from typing import Any, Dict

from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import ConflictException, UnauthorizedException
from app.core.rate_limit import rate_limit_auth
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.database import get_db
from app.dependencies import get_current_token_payload
from app.models.user import TokenBlacklist, User
from app.schemas.auth import (
    LogoutRequest,
    TokenRefreshRequest,
    TokenResponse,
    UserLoginRequest,
    UserRegisterRequest,
)
from app.schemas.common import MessageResponse
from app.schemas.user import UserResponse

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(rate_limit_auth)],
)
async def register_user(
    payload: UserRegisterRequest,
    db: Session = Depends(get_db),
) -> User:
    """Register a new standard user account with bcrypt password hashing."""
    normalized_email = payload.email.lower().strip()
    existing = db.scalar(select(User).where(User.email == normalized_email))
    if existing is not None:
        raise ConflictException(f"An account with email '{normalized_email}' is already registered.")

    user = User(
        email=normalized_email,
        full_name=payload.full_name.strip(),
        hashed_password=hash_password(payload.password),
        role="user",
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post(
    "/login",
    response_model=TokenResponse,
    dependencies=[Depends(rate_limit_auth)],
)
async def login_user(
    payload: UserLoginRequest,
    db: Session = Depends(get_db),
) -> TokenResponse:
    """Authenticate user credentials and return signed JWT access and refresh tokens."""
    normalized_email = payload.email.lower().strip()
    user = db.scalar(select(User).where(User.email == normalized_email))
    if user is None or not verify_password(payload.password, user.hashed_password):
        raise UnauthorizedException("Incorrect email or password.")
    if not user.is_active:
        raise UnauthorizedException("User account is inactive.")

    access_data = create_access_token(subject=user.id, role=user.role)
    refresh_data = create_refresh_token(subject=user.id, role=user.role)

    return TokenResponse(
        access_token=access_data["token"],
        refresh_token=refresh_data["token"],
        token_type="bearer",
        expires_at=access_data["expires_at"],
        user_id=user.id,
        role=user.role,
    )
