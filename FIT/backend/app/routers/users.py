"""User profile management router (get, update, delete own profile)."""

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import ConflictException
from app.core.security import hash_password
from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.common import MessageResponse
from app.schemas.user import UserResponse, UserUpdateRequest

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/me", response_model=UserResponse)
async def get_my_profile(current_user: User = Depends(get_current_user)) -> User:
    """Retrieve the authenticated user's profile."""
    return current_user


@router.put("/me", response_model=UserResponse)
async def update_my_profile(
    payload: UserUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> User:
    """Update the authenticated user's name, email, or password."""
    if payload.email is not None:
        normalized_email = payload.email.lower().strip()
        if normalized_email != current_user.email:
            existing = db.scalar(select(User).where(User.email == normalized_email))
            if existing is not None:
                raise ConflictException(f"Email '{normalized_email}' is already in use.")
            current_user.email = normalized_email

    if payload.full_name is not None:
        current_user.full_name = payload.full_name.strip()

    if payload.password is not None:
        current_user.hashed_password = hash_password(payload.password)

    db.commit()
    db.refresh(current_user)
    return current_user


@router.delete("/me", response_model=MessageResponse)
async def delete_my_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MessageResponse:
    """Delete the authenticated user's profile and associated measurement profiles."""
    db.delete(current_user)
    db.commit()
    return MessageResponse(success=True, message="User profile deleted successfully.")
