"""
Storage abstraction (spec section 10/30).

WHY: the app talks to ONE interface (`Storage.save(...)`) regardless of
whether files land on local disk (default, zero-account dev setup) or
Supabase Storage (production). Switching providers is a single .env
change (STORAGE_PROVIDER=local|supabase) — no route/service code changes.
"""
from abc import ABC, abstractmethod


class Storage(ABC):
    @abstractmethod
    def save(self, filename: str, content: bytes, content_type: str) -> str:
        """Saves the file and returns a publicly-reachable URL for it."""
        raise NotImplementedError


def get_storage() -> Storage:
    from app.core.config import settings

    if settings.STORAGE_PROVIDER == "supabase":
        from app.storage.supabase_storage import SupabaseStorage

        return SupabaseStorage()

    from app.storage.local_storage import LocalStorage

    return LocalStorage()
