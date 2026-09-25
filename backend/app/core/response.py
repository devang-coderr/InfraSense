"""
Every successful response from this API follows the same shape:

    {"success": true, "data": <...>, "message": "..."}

Every error response (see exceptions.py) follows:

    {"success": false, "error": {"code": "...", "message": "..."}}

This keeps the frontend's API layer (lib/api/*.ts) simple: it always
reads `.data` on success and `.error` on failure.
"""
from typing import Any


def ok(data: Any = None, message: str = "OK") -> dict:
    return {"success": True, "data": data, "message": message}
