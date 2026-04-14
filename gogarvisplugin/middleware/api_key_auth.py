"""API key authentication middleware for external consumers."""
import hashlib
import os
from fastapi import Request, HTTPException, Depends
from supabase import create_client, Client


def _get_supabase() -> Client:
    url = os.getenv("SUPABASE_URL", "")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    return create_client(url, key)


def _hash_key(plain: str) -> str:
    return hashlib.sha256(plain.encode()).hexdigest()


class APIKeyUser:
    """Resolved user from a valid API key."""
    def __init__(self, user_id: str, scopes: list[str], key_label: str):
        self.user_id = user_id
        self.scopes = scopes
        self.key_label = key_label

    def has_scope(self, scope: str) -> bool:
        return scope in self.scopes


async def require_api_key(request: Request) -> APIKeyUser:
    """FastAPI dependency that validates Bearer gv_live_... tokens."""
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer gv_live_"):
        raise HTTPException(status_code=401, detail="Missing or invalid API key")

    token = auth.removeprefix("Bearer ").strip()
    key_hash = _hash_key(token)

    sb = _get_supabase()
    result = sb.table("api_keys").select("user_id, scopes, label, revoked_at").eq("key_hash", key_hash).execute()

    if not result.data or len(result.data) == 0:
        raise HTTPException(status_code=401, detail="Invalid API key")

    row = result.data[0]
    if row.get("revoked_at"):
        raise HTTPException(status_code=401, detail="API key has been revoked")

    return APIKeyUser(
        user_id=row["user_id"],
        scopes=row.get("scopes", []),
        key_label=row.get("label", ""),
    )


def require_scope(scope: str):
    """Returns a dependency that checks for a specific scope."""
    async def _check(user: APIKeyUser = Depends(require_api_key)):
        if not user.has_scope(scope):
            raise HTTPException(status_code=403, detail=f"Missing required scope: {scope}")
        return user
    return _check
