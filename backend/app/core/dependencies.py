"""
FastAPI "dependencies" for authentication/authorization.

WHAT: `get_current_user` reads the `Authorization: Bearer <token>` header,
      verifies the JWT, and loads the matching user from the database.
      `require_roles(...)` wraps that to also check the user's role.
WHY:  every protected route just adds `user: User = Depends(get_current_user)`
      (or `Depends(require_roles(...))`) to its signature instead of
      re-implementing auth checks everywhere.
"""
from fastapi import Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.core.exceptions import AppError
from app.core.security import decode_access_token
from app.database.database import get_db
from app.database.models.user import User
from app.database.models.enums import UserRole

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    if credentials is None:
        raise AppError("UNAUTHORIZED", "You must be logged in to do this.", 401)

    payload = decode_access_token(credentials.credentials)
    if payload is None or "sub" not in payload:
        raise AppError("UNAUTHORIZED", "Your session is invalid or has expired. Please log in again.", 401)

    user = db.get(User, int(payload["sub"]))
    if user is None:
        raise AppError("UNAUTHORIZED", "Your session is invalid or has expired. Please log in again.", 401)

    return user


def require_roles(*roles: UserRole):
    """
    Usage: Depends(require_roles(UserRole.OFFICER, UserRole.SUPER_ADMIN))
    Raises 403 if the logged-in user's role isn't in the allowed list.
    """

    def _checker(user: User = Depends(get_current_user)) -> User:
        if user.role not in roles:
            raise AppError("FORBIDDEN", "You don't have permission to do this.", 403)
        return user

    return _checker


# Convenience: any authenticated authority-side role (not a plain citizen).
require_authority = require_roles(UserRole.OFFICER, UserRole.DEPARTMENT_ADMIN, UserRole.SUPER_ADMIN)
