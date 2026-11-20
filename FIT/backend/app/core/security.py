"""Password hashing with bcrypt and JWT token creation/verification with PyJWT."""

import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

import bcrypt
import jwt
from jwt import PyJWTError

from app.config import settings
from app.core.exceptions import UnauthorizedException


def hash_password(plain_password: str) -> str:
    """Hash a plaintext password using bcrypt with automatic salt generation."""
    password_bytes = plain_password.encode("utf-8")
    salt = bcrypt.gensalt(rounds=12)
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plaintext password against a stored bcrypt hash."""
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"),
            hashed_password.encode("utf-8"),
        )
    except ValueError:
        return False


def create_access_token(
    subject: int | str,
    role: str,
    expires_delta: Optional[timedelta] = None,
) -> Dict[str, Any]:
    """Generate a signed JWT access token with unique jti for revocation support."""
    now = datetime.now(timezone.utc)
    expire = now + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    jti = str(uuid.uuid4())
    payload: Dict[str, Any] = {
        "sub": str(subject),
        "role": role,
        "type": "access",
        "jti": jti,
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
    }
    encoded_jwt = jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return {"token": encoded_jwt, "jti": jti, "expires_at": expire}


def create_refresh_token(
    subject: int | str,
    role: str,
    expires_delta: Optional[timedelta] = None,
) -> Dict[str, Any]:
    """Generate a signed JWT refresh token with unique jti."""
    now = datetime.now(timezone.utc)
    expire = now + (expires_delta or timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS))
    jti = str(uuid.uuid4())
    payload: Dict[str, Any] = {
        "sub": str(subject),
        "role": role,
        "type": "refresh",
        "jti": jti,
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
    }
    encoded_jwt = jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return {"token": encoded_jwt, "jti": jti, "expires_at": expire}


def decode_token(token: str, expected_type: Optional[str] = "access") -> Dict[str, Any]:
    """Decode and validate a JWT token, checking signature, expiration, and token type."""
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
        if expected_type and payload.get("type") != expected_type:
            raise UnauthorizedException(f"Invalid token type; expected '{expected_type}'.")
        if "sub" not in payload or "jti" not in payload:
            raise UnauthorizedException("Malformed token payload.")
        return payload
    except PyJWTError as exc:
        raise UnauthorizedException(f"Invalid or expired token: {exc}") from exc
