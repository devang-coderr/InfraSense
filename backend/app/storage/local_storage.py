"""
Default storage provider: saves files to backend/media on disk, served by
FastAPI's StaticFiles mount (see app/main.py) at /media/<filename>.

This needs NO account, NO API key — it's the easiest way to get file
upload working on day one. Swap to Supabase Storage (see
supabase_storage.py) when you deploy to production, since a server's
local disk usually isn't persistent/shared across deployments.
"""
import os
import uuid

from app.storage.base import Storage

MEDIA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "media")
os.makedirs(MEDIA_DIR, exist_ok=True)


class LocalStorage(Storage):
    def save(self, filename: str, content: bytes, content_type: str) -> str:
        ext = os.path.splitext(filename)[1] or ""
        unique_name = f"{uuid.uuid4().hex}{ext}"
        path = os.path.join(MEDIA_DIR, unique_name)
        with open(path, "wb") as f:
            f.write(content)
        return f"/media/{unique_name}"
