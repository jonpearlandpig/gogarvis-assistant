"""Garvis Public API v1 — external-facing endpoints for API key holders."""
import os
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from supabase import create_client, Client
from ..middleware.api_key_auth import APIKeyUser, require_scope

router = APIRouter(prefix="/api/v1", tags=["Public API v1"])


def _sb() -> Client:
    return create_client(
        os.getenv("SUPABASE_URL", ""),
        os.getenv("SUPABASE_SERVICE_ROLE_KEY", ""),
    )


# ── Projects ────────────────────────────────────────────────────

@router.get("/projects")
async def list_projects(user: APIKeyUser = Depends(require_scope("projects:read"))):
    sb = _sb()
    result = sb.table("akb_projects").select("id, name, status, created_at").eq("user_id", user.user_id).execute()
    return {"projects": result.data or []}


@router.get("/projects/{project_id}")
async def get_project(project_id: str, user: APIKeyUser = Depends(require_scope("projects:read"))):
    sb = _sb()
    proj = sb.table("akb_projects").select("*").eq("id", project_id).eq("user_id", user.user_id).execute()
    if not proj.data:
        raise HTTPException(status_code=404, detail="Project not found")

    ctx = sb.table("akb_project_context").select("domain_key, field_key, value, status").eq("project_id", project_id).eq("user_id", user.user_id).execute()
    return {"project": proj.data[0], "context": ctx.data or []}


class ContextUpdate(BaseModel):
    domain_key: str
    field_key: str
    value: str
    status: str = "draft"


@router.post("/projects/{project_id}/context")
async def upsert_context(project_id: str, body: ContextUpdate, user: APIKeyUser = Depends(require_scope("akb:write"))):
    sb = _sb()
    # Verify project ownership
    proj = sb.table("akb_projects").select("id").eq("id", project_id).eq("user_id", user.user_id).execute()
    if not proj.data:
        raise HTTPException(status_code=404, detail="Project not found")

    result = sb.table("akb_project_context").upsert({
        "user_id": user.user_id,
        "project_id": project_id,
        "domain_key": body.domain_key,
        "field_key": body.field_key,
        "value": body.value,
        "status": body.status,
    }, on_conflict="user_id,project_id,domain_key,field_key").execute()

    return {"ok": True, "updated": len(result.data or [])}


# ── AKB Domains ─────────────────────────────────────────────────

@router.get("/akb/domains")
async def list_domains(user: APIKeyUser = Depends(require_scope("akb:read"))):
    sb = _sb()
    result = sb.table("akb_domains").select("domain_key, status, locked, min_met, progress_json").eq("user_id", user.user_id).execute()
    return {"domains": result.data or []}


# ── AKB Drafts ──────────────────────────────────────────────────

@router.get("/akb/drafts")
async def list_drafts(user: APIKeyUser = Depends(require_scope("akb:read"))):
    sb = _sb()
    result = sb.table("akb_drafts").select("id, domain, title, body_md, status, proposed_by, created_at").eq("user_id", user.user_id).order("created_at", desc=True).execute()
    return {"drafts": result.data or []}


class DraftCreate(BaseModel):
    domain: str
    title: str
    body_md: str
    proposed_by: str = "external_api"
    tags: list[str] = []


@router.post("/akb/drafts")
async def create_draft(body: DraftCreate, user: APIKeyUser = Depends(require_scope("akb:write"))):
    sb = _sb()
    result = sb.table("akb_drafts").insert({
        "user_id": user.user_id,
        "domain": body.domain,
        "title": body.title,
        "body_md": body.body_md,
        "proposed_by": body.proposed_by,
        "tags": body.tags,
        "sources": [{"note": "External API"}],
    }).execute()

    return {"ok": True, "draft": result.data[0] if result.data else None}


# ── Artifacts ───────────────────────────────────────────────────

@router.get("/artifacts")
async def list_artifacts(user: APIKeyUser = Depends(require_scope("akb:read"))):
    sb = _sb()
    result = sb.table("artifacts").select("id, title, type, status, created_at").eq("user_id", user.user_id).order("created_at", desc=True).execute()
    return {"artifacts": result.data or []}
