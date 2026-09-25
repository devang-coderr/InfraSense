"""
Supabase Storage provider — OPTIONAL, used only when STORAGE_PROVIDER=supabase.

Uses Supabase's plain REST API over HTTPS (no supabase-py SDK dependency,
keeps requirements.txt small). See README "Supabase Storage setup" for
how to create the account/bucket/keys this needs.

SECURITY: SUPABASE_SERVICE_ROLE_KEY is a secret that can bypass all of
Supabase's access rules. It must only ever live in the backend's .env —
NEVER sent to the frontend, NEVER put in NEXT_PUBLIC_* variables.

NOTE: this module could not be executed/tested in the environment this
backend was generated in (no network access). The request shape below
follows Supabase's documented Storage REST API as of this writing —
verify with one real upload (see README "Test file upload") before
relying on it in production. If anything's off, the error message
Supabase returns will say exactly what.
"""
import uuid

import httpx

from app.core.config import settings
from app.core.exceptions import AppError
from app.storage.base import Storage


class SupabaseStorage(Storage):
    def save(self, filename: str, content: bytes, content_type: str) -> str:
        if not (settings.SUPABASE_URL and settings.SUPABASE_SERVICE_ROLE_KEY):
            raise AppError(
                "STORAGE_NOT_CONFIGURED",
                "Supabase storage is selected but SUPABASE_URL / "
                "SUPABASE_SERVICE_ROLE_KEY are not set in .env.",
                500,
            )

        ext = filename.rsplit(".", 1)[-1] if "." in filename else "bin"
        object_path = f"{uuid.uuid4().hex}.{ext}"
        bucket = settings.SUPABASE_STORAGE_BUCKET
        url = f"{settings.SUPABASE_URL}/storage/v1/object/{bucket}/{object_path}"

        response = httpx.post(
            url,
            content=content,
            headers={
                "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
                "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
                "Content-Type": content_type or "application/octet-stream",
            },
            timeout=30,
        )
        if response.status_code >= 400:
            raise AppError("STORAGE_UPLOAD_FAILED", f"Supabase upload failed: {response.text}", 502)

        return f"{settings.SUPABASE_URL}/storage/v1/object/public/{bucket}/{object_path}"
