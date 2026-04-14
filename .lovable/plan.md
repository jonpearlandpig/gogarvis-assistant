

# Garvis Public API — Plan for Shane Pass (and future external consumers)

## Context

Shane Pass is a Garvis user who wants to connect his ministry OS ("Jennie," running on Cloudflare Workers) to Garvis via REST API. He needs to query projects, knowledge items, and push updates back — replacing manual JSON exports with a live connection.

Your data lives in Supabase (Lovable Cloud). Your FastAPI backend (`gogarvisplugin`) currently has one stub route (`/api/akb/progress`). There is no API key system or external-facing API yet.

## What We Need to Build

### 1. API Key table + auth middleware (Supabase + FastAPI)

Create a `api_keys` table in the database to store per-user API keys:

```text
api_keys
├── id (uuid, PK)
├── user_id (uuid, references auth.users)
├── key_hash (text, SHA-256 of the key)
├── label (text, e.g. "Jennie connector")
├── scopes (text[], e.g. ["akb:read", "akb:write", "projects:read"])
├── created_at (timestamptz)
└── revoked_at (timestamptz, nullable)
```

RLS: users can only see/manage their own keys. The FastAPI middleware validates incoming `Authorization: Bearer gv_...` headers by hashing the token and looking it up.

### 2. FastAPI API router (`/api/v1/...`)

New versioned router on the FastAPI side with these endpoints:

| Method | Path | Scope | Description |
|--------|------|-------|-------------|
| GET | `/api/v1/projects` | `projects:read` | List user's AKB projects |
| GET | `/api/v1/projects/{id}` | `projects:read` | Get project + context fields |
| POST | `/api/v1/projects/{id}/context` | `akb:write` | Push a context field update |
| GET | `/api/v1/akb/domains` | `akb:read` | Get AKB domain progress |
| GET | `/api/v1/akb/drafts` | `akb:read` | List AKB drafts |
| POST | `/api/v1/akb/drafts` | `akb:write` | Create a new AKB draft |
| GET | `/api/v1/artifacts` | `akb:read` | List artifacts |

FastAPI will use a Supabase service-role client to query on behalf of the authenticated user (looked up from the API key).

### 3. Key management UI (frontend)

A simple panel in the Workspace settings where users can:
- Generate a new API key (shown once, stored hashed)
- Label keys and assign scopes
- Revoke keys

### 4. Edge function for key generation

A backend function that generates `gv_live_...` prefixed keys, hashes them, stores the hash, and returns the plaintext key once.

### 5. Documentation endpoint

`GET /api/v1/docs` — FastAPI's built-in OpenAPI/Swagger UI, scoped to the v1 router, so Shane (and future users) get interactive docs.

## Implementation Order

1. **Database migration** — create `api_keys` table with RLS
2. **FastAPI auth middleware** — validate Bearer tokens against key hashes
3. **FastAPI v1 router** — implement the endpoints above, querying Supabase
4. **Edge function** — key generation + hashing
5. **Frontend panel** — key management UI in workspace
6. **Docs** — auto-generated from FastAPI, plus a markdown guide

## What Shane Gets

Once deployed, Shane configures Jennie with:
```
GARVIS_API_URL=https://your-fastapi-host/api/v1
GARVIS_API_KEY=gv_live_abc123...
```

His Cloudflare Worker calls `GET /api/v1/projects` with that key and gets live data. Two-way sync is handled by the write endpoints.

## Technical Notes

- API keys are hashed (SHA-256) at rest — plaintext is never stored
- Scopes are enforced per-endpoint in the FastAPI middleware
- The FastAPI backend queries Supabase using a service-role key, filtered by the user_id associated with the API key
- Rate limiting can be added later (Redis or in-memory for MVP)

