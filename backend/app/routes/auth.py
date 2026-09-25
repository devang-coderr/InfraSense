from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.core.response import ok
from app.database.database import get_db
from app.database.models.user import User
from app.schemas.auth import RegisterRequest, LoginRequest, TokenResponse, UserOut
from app.services.auth_service import register_user, authenticate_user, issue_token_for

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


def _user_out(user: User) -> UserOut:
    return UserOut(
        id=str(user.id),
        name=user.name,
        email=user.email,
        role=user.role,
        department=user.department.name if user.department else None,
    )


@router.post("/register")
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    user = register_user(db, payload)
    token = issue_token_for(user)
    return ok(TokenResponse(access_token=token, user=_user_out(user)), "User registered successfully")


@router.post("/login")
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = authenticate_user(db, payload.email, payload.password)
    token = issue_token_for(user)
    return ok(TokenResponse(access_token=token, user=_user_out(user)), "Login successful")


@router.get("/me")
def me(user: User = Depends(get_current_user)):
    return ok(_user_out(user))


@router.post("/logout")
def logout():
    # JWTs are stateless — "logout" just means the frontend discards the
    # token. Nothing to invalidate server-side in this MVP (no refresh
    # tokens / token blacklist yet).
    return ok(message="Logged out")
