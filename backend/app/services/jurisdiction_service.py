"""
Authority Jurisdiction Service.

Enforces State + District based access control and query scoping for Authority accounts.
"""
from sqlalchemy.orm import Query
from app.database.models.user import User
from app.database.models.issue import Issue
from app.database.models.enums import UserRole


def apply_jurisdiction_scope(query: Query, user: User, model_cls=Issue) -> Query:
    """
    Applies State + District filtering to an Issue query for Authority accounts.
    Super Admins retain global visibility across all jurisdictions.
    """
    if user.role == UserRole.SUPER_ADMIN:
        return query

    if user.role in (UserRole.OFFICER, UserRole.DEPARTMENT_ADMIN):
        state_col = getattr(model_cls, "state")
        dist_col = getattr(model_cls, "district")
        # When an authority has assigned jurisdiction, scope strictly to matching state & district
        if user.state and user.district:
            return query.filter(state_col == user.state, dist_col == user.district)
        elif user.state:
            return query.filter(state_col == user.state)
        elif user.district:
            return query.filter(dist_col == user.district)

    return query


def is_issue_in_jurisdiction(issue: Issue, user: User) -> bool:
    """
    Checks if a specific Issue record is within the authority's assigned jurisdiction.
    """
    if user.role == UserRole.SUPER_ADMIN:
        return True

    if user.role in (UserRole.OFFICER, UserRole.DEPARTMENT_ADMIN):
        if user.state and user.district:
            return issue.state == user.state and issue.district == user.district
        elif user.state:
            return issue.state == user.state
        elif user.district:
            return issue.district == user.district

    return True
