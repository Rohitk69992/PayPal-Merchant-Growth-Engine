import base64
import os
import secrets
import hashlib
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
import jwt
import bcrypt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, VerificationError, InvalidHashError

from backend.app.core.config import settings

# Initialize Argon2id hasher with secure parameters
_argon2_hasher = PasswordHasher(
    time_cost=3,
    memory_cost=65536,  # 64 MB
    parallelism=4,
    hash_len=32,
    salt_len=16
)

def hash_password(password: str) -> str:
    """
    Hashes a password using Argon2id.
    """
    return _argon2_hasher.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verifies a plain password against an Argon2id or legacy Bcrypt hash.
    """
    if not hashed_password or not plain_password:
        return False

    # Check for Argon2id
    if hashed_password.startswith("$argon2"):
        try:
            return _argon2_hasher.verify(hashed_password, plain_password)
        except (VerifyMismatchError, VerificationError, InvalidHashError):
            return False
        except Exception:
            return False

    # Fallback check for legacy Bcrypt ($2a$ or $2b$)
    if hashed_password.startswith("$2b$") or hashed_password.startswith("$2a$"):
        try:
            return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
        except Exception:
            return False

    return False

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Creates a signed JWT access token.
    """
    to_encode = data.copy()
    now_utc = datetime.now(timezone.utc)
    if expires_delta:
        expire = now_utc + expires_delta
    else:
        expire = now_utc + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "iat": now_utc})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> Optional[dict]:
    """
    Decodes and validates a JWT access token.
    """
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except (jwt.PyJWTError, Exception):
        return None

def generate_secure_token(nbytes: int = 32) -> str:
    """
    Generates a cryptographically strong, URL-safe random string.
    """
    return secrets.token_urlsafe(nbytes)

def hash_token(token: str) -> str:
    """
    Computes deterministic SHA-256 hash of a single-use token for secure storage at rest.
    """
    return hashlib.sha256(token.encode("utf-8")).hexdigest()

def verify_google_id_token(id_token_str: str) -> Dict[str, Any]:
    """
    Verifies a Google OpenID Connect ID token server-side.
    Validates audience, signature, expiration, and issuer.
    """
    if not settings.GOOGLE_CLIENT_ID:
        raise ValueError("Google OAuth Client ID is not configured on the server.")

    from google.oauth2 import id_token
    from google.auth.transport import requests as google_requests

    request = google_requests.Request()
    id_info = id_token.verify_oauth2_token(
        id_token_str,
        request,
        settings.GOOGLE_CLIENT_ID
    )

    # Validate issuer according to OpenID Connect specs
    if id_info.get("iss") not in ["accounts.google.com", "https://accounts.google.com"]:
        raise ValueError("Invalid Google token issuer.")

    return id_info

# Symmetric encryption for API secrets stored at rest
def encrypt_secret(plain_text: str) -> str:
    if not plain_text:
        return ""
    key = settings.SECRET_KEY.encode()
    b_text = plain_text.encode()
    encrypted = bytes([b ^ key[i % len(key)] for i, b in enumerate(b_text)])
    return base64.b64encode(encrypted).decode()

def decrypt_secret(cipher_text: str) -> str:
    if not cipher_text:
        return ""
    try:
        key = settings.SECRET_KEY.encode()
        encrypted = base64.b64decode(cipher_text.encode())
        decrypted = bytes([b ^ key[i % len(key)] for i, b in enumerate(encrypted)])
        return decrypted.decode()
    except Exception:
        return ""
