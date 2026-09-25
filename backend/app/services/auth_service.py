from sqlalchemy.orm import Session

from app.core.exceptions import AppError
from app.core.security import hash_password, verify_password, create_access_token
from app.database.models.department import Department
from app.database.models.user import User
from app.database.models.enums import UserRole
from app.schemas.auth import RegisterRequest


def register_user(db: Session, payload: RegisterRequest) -> User:
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise AppError("EMAIL_TAKEN", "An account with this email already exists.", 409)

    department_id = None
    if payload.department_name:
        dept = db.query(Department).filter(Department.name == payload.department_name).first()
        if dept:
            department_id = dept.id

    user = User(
        name=payload.name,
        email=payload.email,
        password_hash=hash_password(payload.password),
        role=payload.role,
        department_id=department_id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def authenticate_user(db: Session, email: str, password: str) -> User:
    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(password, user.password_hash):
        raise AppError("INVALID_CREDENTIALS", "Incorrect email or password.", 401)
    return user


def issue_token_for(user: User) -> str:
    return create_access_token(subject=str(user.id), extra_claims={"role": user.role.value})
