from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.core.response import ok
from app.database.database import get_db
from app.database.models.user import User
from app.routes.auth import _user_out

router = APIRouter(prefix="/api/v1/users", tags=["users"])


class UpdateMeRequest(BaseModel):
    name: str | None = None


@router.get("/me")
def get_me(user: User = Depends(get_current_user)):
    return ok(_user_out(user))


@router.patch("/me")
def update_me(payload: UpdateMeRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if payload.name:
        user.name = payload.name
        db.commit()
        db.refresh(user)
    return ok(_user_out(user), "Profile updated")
