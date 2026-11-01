from typing import Optional, List, Tuple
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from backend.app.core.database import get_db
from backend.app.core.config import settings
from backend.app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    generate_secure_token,
    hash_token,
    verify_google_id_token,
)
from backend.app.core.dependencies import (
    get_current_user,
    get_current_token_payload,
)
from backend.app.models.user import (
    User,
    UserSession,
    AuthIdentity,
    PasswordResetToken,
    EmailVerificationToken,
    AuthenticationEvent,
    MerchantMember,
)
from backend.app.schemas.auth import (
    UserRegister,
    UserLogin,
    GoogleLoginRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    EmailVerificationRequest,
    AccountDeactivateRequest,
    PasswordChange,
    UserResponse,
    Token,
    UserSessionResponse,
    AuthEventResponse,
    MessageResponse,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])

def extract_client_info(request: Request) -> Tuple[Optional[str], Optional[str]]:
    ip = request.headers.get("x-forwarded-for")
    if ip:
        ip = ip.split(",")[0].strip()
    elif request.client:
        ip = request.client.host
    else:
        ip = None
    ua = request.headers.get("user-agent", "")[:255] or None
    return ip, ua

def record_auth_event(
    db: Session,
    event_type: str,
    email: str,
    user_id: Optional[str] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
) -> AuthenticationEvent:
    event = AuthenticationEvent(
        user_id=user_id,
        email_attempted=email.lower(),
        event_type=event_type,
        ip_address=ip_address,
        user_agent=user_agent,
    )
    db.add(event)
    return event

def create_user_session(
    db: Session,
    user_id: str,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
) -> UserSession:
    session_token = generate_secure_token(32)
    session = UserSession(
        user_id=user_id,
        session_token=session_token,
        ip_address=ip_address,
        user_agent=user_agent,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
        is_revoked=False,
    )
    db.add(session)
    db.flush()
    return session

@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register(user_in: UserRegister, request: Request, db: Session = Depends(get_db)):
    client_ip, user_agent = extract_client_info(request)
    normalized_email = user_in.email.lower()

    # Check for existing user
    existing = db.query(User).filter(User.email == normalized_email).first()
    if existing:
        record_auth_event(
            db,
            event_type="REGISTER_FAILURE_DUPLICATE",
            email=normalized_email,
            user_id=existing.id,
            ip_address=client_ip,
            user_agent=user_agent,
        )
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists."
        )

    # Create new user with Argon2id hash
    user = User(
        email=normalized_email,
        hashed_password=hash_password(user_in.password),
        full_name=user_in.full_name,
        is_active=True,
        is_verified=False,
    )
    db.add(user)
    db.flush()

    # Create persistent session
    session = create_user_session(db, user_id=user.id, ip_address=client_ip, user_agent=user_agent)

    # Record audit event
    record_auth_event(
        db,
        event_type="REGISTER_SUCCESS",
        email=normalized_email,
        user_id=user.id,
        ip_address=client_ip,
        user_agent=user_agent,
    )
    db.commit()
    db.refresh(user)

    # Issue JWT access token with embedded session ID
    access_token = create_access_token(
        data={"sub": user.id, "email": user.email, "sid": session.id},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    user_resp = UserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        is_active=user.is_active,
        is_verified=user.is_verified,
        has_merchant=False,
        created_at=user.created_at
    )

    return Token(
        access_token=access_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=user_resp,
        session_id=session.id
    )

@router.post("/login", response_model=Token)
def login(login_in: UserLogin, request: Request, db: Session = Depends(get_db)):
    client_ip, user_agent = extract_client_info(request)
    normalized_email = login_in.email.lower()

    user = db.query(User).filter(User.email == normalized_email).first()
    if not user:
        record_auth_event(
            db,
            event_type="LOGIN_FAILURE_NOT_FOUND",
            email=normalized_email,
            ip_address=client_ip,
            user_agent=user_agent,
        )
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not verify_password(login_in.password, user.hashed_password):
        record_auth_event(
            db,
            event_type="LOGIN_FAILURE_WRONG_PASSWORD",
            email=normalized_email,
            user_id=user.id,
            ip_address=client_ip,
            user_agent=user_agent,
        )
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        record_auth_event(
            db,
            event_type="LOGIN_FAILURE_INACTIVE",
            email=normalized_email,
            user_id=user.id,
            ip_address=client_ip,
            user_agent=user_agent,
        )
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive or deactivated."
        )

    # Create new session
    session = create_user_session(db, user_id=user.id, ip_address=client_ip, user_agent=user_agent)

    # Record login success
    record_auth_event(
        db,
        event_type="LOGIN_SUCCESS",
        email=normalized_email,
        user_id=user.id,
        ip_address=client_ip,
        user_agent=user_agent,
    )
    db.commit()

    has_merchant = db.query(MerchantMember).filter(MerchantMember.user_id == user.id).first() is not None

    access_token = create_access_token(
        data={"sub": user.id, "email": user.email, "sid": session.id},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    user_resp = UserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        is_active=user.is_active,
        is_verified=user.is_verified,
        has_merchant=has_merchant,
        created_at=user.created_at
    )

    return Token(
        access_token=access_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=user_resp,
        session_id=session.id
    )

@router.post("/logout", response_model=MessageResponse)
def logout(
    request: Request,
    current_user: User = Depends(get_current_user),
    payload: dict = Depends(get_current_token_payload),
    db: Session = Depends(get_db)
):
    client_ip, user_agent = extract_client_info(request)
    sid = payload.get("sid")
    if sid:
        session = db.query(UserSession).filter(UserSession.id == sid).first()
        if session:
            session.is_revoked = True

    record_auth_event(
        db,
        event_type="LOGOUT",
        email=current_user.email,
        user_id=current_user.id,
        ip_address=client_ip,
        user_agent=user_agent,
    )
    db.commit()
    return MessageResponse(message="Successfully logged out.")

@router.post("/google", response_model=Token)
def google_auth(login_in: GoogleLoginRequest, request: Request, db: Session = Depends(get_db)):
    client_ip, user_agent = extract_client_info(request)

    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google OAuth is not configured on this server. Please configure GOOGLE_CLIENT_ID in backend/.env."
        )

    try:
        id_info = verify_google_id_token(login_in.id_token)
    except Exception as e:
        record_auth_event(
            db,
            event_type="GOOGLE_LOGIN_FAILURE",
            email="google_auth_attempt",
            ip_address=client_ip,
            user_agent=user_agent,
        )
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Google token verification failed: {str(e)}"
        )

    google_sub = id_info.get("sub")
    google_email = (id_info.get("email") or "").strip().lower()
    email_verified = id_info.get("email_verified", False)
    user_name = (id_info.get("name") or "").strip() or google_email.split("@")[0]

    if not google_sub or not google_email:
        record_auth_event(
            db,
            event_type="GOOGLE_LOGIN_FAILURE",
            email="incomplete_payload",
            ip_address=client_ip,
            user_agent=user_agent,
        )
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incomplete identity payload from Google."
        )

    if not email_verified:
        record_auth_event(
            db,
            event_type="GOOGLE_LOGIN_FAILURE_UNVERIFIED_EMAIL",
            email=google_email,
            ip_address=client_ip,
            user_agent=user_agent,
        )
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google email address is not verified by Google."
        )

    # Check if identity already linked
    identity = db.query(AuthIdentity).filter(
        AuthIdentity.provider == "google",
        AuthIdentity.provider_subject_id == google_sub
    ).first()

    if identity:
        user = db.query(User).filter(User.id == identity.user_id).first()
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Linked user account not found.")
    else:
        # Check if user already exists with this email
        user = db.query(User).filter(User.email == google_email).first()
        if user:
            # Check if user is active BEFORE linking
            if not user.is_active:
                record_auth_event(
                    db,
                    event_type="LOGIN_FAILURE_INACTIVE",
                    email=google_email,
                    user_id=user.id,
                    ip_address=client_ip,
                    user_agent=user_agent,
                )
                db.commit()
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is deactivated.")

            # Link identity to existing account safely
            identity = AuthIdentity(
                user_id=user.id,
                provider="google",
                provider_subject_id=google_sub,
                email=google_email
            )
            db.add(identity)
            user.is_verified = True
            try:
                db.flush()
            except IntegrityError:
                db.rollback()
                # Identity or user may have been concurrently created
                identity = db.query(AuthIdentity).filter(
                    AuthIdentity.provider == "google",
                    AuthIdentity.provider_subject_id == google_sub
                ).first()
                if identity:
                    user = db.query(User).filter(User.id == identity.user_id).first()
                else:
                    raise
        else:
            # Create new user
            user = User(
                email=google_email,
                full_name=user_name,
                hashed_password=hash_password(generate_secure_token(32)),
                is_active=True,
                is_verified=True,
            )
            db.add(user)
            try:
                db.flush()
                identity = AuthIdentity(
                    user_id=user.id,
                    provider="google",
                    provider_subject_id=google_sub,
                    email=google_email
                )
                db.add(identity)
                db.flush()
            except IntegrityError:
                db.rollback()
                # Handle race condition where user or identity was committed concurrently
                identity = db.query(AuthIdentity).filter(
                    AuthIdentity.provider == "google",
                    AuthIdentity.provider_subject_id == google_sub
                ).first()
                if identity:
                    user = db.query(User).filter(User.id == identity.user_id).first()
                else:
                    user = db.query(User).filter(User.email == google_email).first()
                    if user:
                        identity = AuthIdentity(
                            user_id=user.id,
                            provider="google",
                            provider_subject_id=google_sub,
                            email=google_email
                        )
                        db.add(identity)
                        db.flush()
                    else:
                        raise

    if not user or not user.is_active:
        record_auth_event(
            db,
            event_type="LOGIN_FAILURE_INACTIVE",
            email=google_email,
            user_id=user.id if user else None,
            ip_address=client_ip,
            user_agent=user_agent,
        )
        db.commit()
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is deactivated.")

    # Create session
    session = create_user_session(db, user_id=user.id, ip_address=client_ip, user_agent=user_agent)

    record_auth_event(
        db,
        event_type="GOOGLE_LOGIN_SUCCESS",
        email=google_email,
        user_id=user.id,
        ip_address=client_ip,
        user_agent=user_agent,
    )
    db.commit()
    db.refresh(user)

    has_merchant = db.query(MerchantMember).filter(MerchantMember.user_id == user.id).first() is not None

    access_token = create_access_token(
        data={"sub": user.id, "email": user.email, "sid": session.id},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    user_resp = UserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        is_active=user.is_active,
        is_verified=user.is_verified,
        has_merchant=has_merchant,
        created_at=user.created_at
    )

    return Token(
        access_token=access_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=user_resp,
        session_id=session.id
    )

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    has_merchant = db.query(MerchantMember).filter(MerchantMember.user_id == current_user.id).first() is not None
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        is_active=current_user.is_active,
        is_verified=current_user.is_verified,
        has_merchant=has_merchant,
        created_at=current_user.created_at
    )

@router.post("/change-password", response_model=MessageResponse)
def change_password(
    pwd_in: PasswordChange,
    request: Request,
    current_user: User = Depends(get_current_user),
    payload: dict = Depends(get_current_token_payload),
    db: Session = Depends(get_db)
):
    client_ip, user_agent = extract_client_info(request)

    if not verify_password(pwd_in.current_password, current_user.hashed_password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect.")

    current_user.hashed_password = hash_password(pwd_in.new_password)

    # Revoke all other active sessions for this user for security
    current_sid = payload.get("sid")
    other_sessions = db.query(UserSession).filter(
        UserSession.user_id == current_user.id,
        UserSession.id != current_sid,
        UserSession.is_revoked == False
    ).all()
    for s in other_sessions:
        s.is_revoked = True

    record_auth_event(
        db,
        event_type="PASSWORD_CHANGE_SUCCESS",
        email=current_user.email,
        user_id=current_user.id,
        ip_address=client_ip,
        user_agent=user_agent,
    )
    db.commit()
    return MessageResponse(message="Password updated successfully.")

@router.post("/forgot-password", response_model=MessageResponse)
def forgot_password(req: ForgotPasswordRequest, request: Request, db: Session = Depends(get_db)):
    client_ip, user_agent = extract_client_info(request)
    normalized_email = req.email.lower()

    user = db.query(User).filter(User.email == normalized_email).first()
    debug_token: Optional[str] = None

    if user and user.is_active:
        # Invalidate existing unused tokens for this user
        existing_tokens = db.query(PasswordResetToken).filter(
            PasswordResetToken.user_id == user.id,
            PasswordResetToken.is_used == False
        ).all()
        for t in existing_tokens:
            t.is_used = True

        # Generate new 32-byte secure token (15-minute validity)
        raw_token = generate_secure_token(32)
        token_hash = hash_token(raw_token)

        reset_record = PasswordResetToken(
            user_id=user.id,
            token_hash=token_hash,
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=15),
            is_used=False
        )
        db.add(reset_record)

        record_auth_event(
            db,
            event_type="PASSWORD_RESET_REQUESTED",
            email=normalized_email,
            user_id=user.id,
            ip_address=client_ip,
            user_agent=user_agent,
        )
        db.commit()

        if settings.DEBUG:
            debug_token = raw_token

    return MessageResponse(
        message="If this email is registered with an active account, password reset instructions have been dispatched.",
        reset_token=debug_token
    )

@router.post("/reset-password", response_model=MessageResponse)
def reset_password(req: ResetPasswordRequest, request: Request, db: Session = Depends(get_db)):
    client_ip, user_agent = extract_client_info(request)
    computed_hash = hash_token(req.token)

    token_record = db.query(PasswordResetToken).filter(
        PasswordResetToken.token_hash == computed_hash,
        PasswordResetToken.is_used == False,
    ).first()

    if not token_record:
        record_auth_event(
            db,
            event_type="PASSWORD_RESET_FAILED",
            email="unknown_reset_attempt",
            ip_address=client_ip,
            user_agent=user_agent,
        )
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid, expired, or already used password reset token."
        )

    expires_at = token_record.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        record_auth_event(
            db,
            event_type="PASSWORD_RESET_FAILED",
            email="expired_reset_attempt",
            ip_address=client_ip,
            user_agent=user_agent,
        )
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password reset token has expired."
        )

    user = db.query(User).filter(User.id == token_record.user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Associated user not found.")

    # Mark token used
    token_record.is_used = True

    # Update password with Argon2id hash
    user.hashed_password = hash_password(req.new_password)

    # Revoke ALL active sessions for security
    active_sessions = db.query(UserSession).filter(
        UserSession.user_id == user.id,
        UserSession.is_revoked == False
    ).all()
    for s in active_sessions:
        s.is_revoked = True

    record_auth_event(
        db,
        event_type="PASSWORD_RESET_SUCCESS",
        email=user.email,
        user_id=user.id,
        ip_address=client_ip,
        user_agent=user_agent,
    )
    db.commit()

    return MessageResponse(message="Password has been successfully reset. Please log in with your new password.")

@router.post("/verify-email/request", response_model=MessageResponse)
def request_email_verification(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.is_verified:
        return MessageResponse(message="Email is already verified.")

    # Invalidate previous unused verification tokens
    existing_tokens = db.query(EmailVerificationToken).filter(
        EmailVerificationToken.user_id == current_user.id,
        EmailVerificationToken.is_used == False
    ).all()
    for t in existing_tokens:
        t.is_used = True

    raw_token = generate_secure_token(32)
    token_hash = hash_token(raw_token)

    record = EmailVerificationToken(
        user_id=current_user.id,
        token_hash=token_hash,
        expires_at=datetime.now(timezone.utc) + timedelta(hours=24),
        is_used=False
    )
    db.add(record)
    db.commit()

    return MessageResponse(
        message="Verification token generated.",
        reset_token=raw_token if settings.DEBUG else None
    )

@router.post("/verify-email/confirm", response_model=MessageResponse)
def confirm_email_verification(
    req: EmailVerificationRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    client_ip, user_agent = extract_client_info(request)
    computed_hash = hash_token(req.token)

    token_record = db.query(EmailVerificationToken).filter(
        EmailVerificationToken.token_hash == computed_hash,
        EmailVerificationToken.is_used == False,
    ).first()

    if not token_record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid, expired, or already used email verification token."
        )

    expires_at = token_record.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email verification token has expired."
        )

    user = db.query(User).filter(User.id == token_record.user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    token_record.is_used = True
    user.is_verified = True

    record_auth_event(
        db,
        event_type="EMAIL_VERIFIED",
        email=user.email,
        user_id=user.id,
        ip_address=client_ip,
        user_agent=user_agent,
    )
    db.commit()

    return MessageResponse(message="Email has been successfully verified.")

@router.post("/deactivate", response_model=MessageResponse)
def deactivate_account(
    req: AccountDeactivateRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    client_ip, user_agent = extract_client_info(request)

    if req.confirmation != "DEACTIVATE":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Confirmation text must exactly equal 'DEACTIVATE'."
        )

    if not verify_password(req.password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect password."
        )

    current_user.is_active = False

    # Revoke all sessions
    active_sessions = db.query(UserSession).filter(
        UserSession.user_id == current_user.id,
        UserSession.is_revoked == False
    ).all()
    for s in active_sessions:
        s.is_revoked = True

    record_auth_event(
        db,
        event_type="ACCOUNT_DEACTIVATED",
        email=current_user.email,
        user_id=current_user.id,
        ip_address=client_ip,
        user_agent=user_agent,
    )
    db.commit()

    return MessageResponse(message="Account has been successfully deactivated.")

@router.get("/sessions", response_model=List[UserSessionResponse])
def get_user_sessions(
    current_user: User = Depends(get_current_user),
    payload: dict = Depends(get_current_token_payload),
    db: Session = Depends(get_db)
):
    sessions = db.query(UserSession).filter(
        UserSession.user_id == current_user.id
    ).order_by(UserSession.created_at.desc()).limit(20).all()

    current_sid = payload.get("sid")
    res = []
    for s in sessions:
        res.append(UserSessionResponse(
            id=s.id,
            user_id=s.user_id,
            session_token=s.session_token[:8] + "...",  # Redact full token
            ip_address=s.ip_address,
            user_agent=s.user_agent,
            expires_at=s.expires_at,
            is_revoked=s.is_revoked,
            created_at=s.created_at,
            is_current=(s.id == current_sid)
        ))
    return res

@router.delete("/sessions/{session_id}", response_model=MessageResponse)
def revoke_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    session = db.query(UserSession).filter(
        UserSession.id == session_id,
        UserSession.user_id == current_user.id
    ).first()

    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found.")

    session.is_revoked = True
    db.commit()

    return MessageResponse(message="Session successfully revoked.")

@router.get("/events", response_model=List[AuthEventResponse])
def get_auth_events(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    events = db.query(AuthenticationEvent).filter(
        AuthenticationEvent.user_id == current_user.id
    ).order_by(AuthenticationEvent.created_at.desc()).limit(50).all()

    return [
        AuthEventResponse(
            id=e.id,
            user_id=e.user_id,
            email_attempted=e.email_attempted,
            event_type=e.event_type,
            ip_address=e.ip_address,
            user_agent=e.user_agent,
            created_at=e.created_at
        )
        for e in events
    ]
