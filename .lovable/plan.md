

# Deploy Public REST API as Live Edge Functions

## Context
Shane has a Cloudflare Worker (Jennie) ready to connect. The FastAPI v1 routes in `gogarvisplugin/` exist but aren't deployed anywhere Shane can reach. The `api_keys` table and key generation edge function already work. We need to deploy the actual API endpoints as Supabase Edge Functions so they're live at a real URL.

## What Shane Gets
- **Base URL**: `https://dqtdqjqffikfzebfpoul.supabase.co/functions/v1/api-v1`
- **Auth**: `Authorization: Bearer gv_live_...` (generated from the Connections panel)
- **Endpoints** via query param routing:
  - `GET /api-v1?route=projects` — list his projects
  - `GET /api-v1?route=projects&id=xxx` — single project with context
  - `GET /api-v1?route=domains` — AKB domain coverage
  - `GET /api-v1?route=drafts` — AKB drafts
  - `GET /api-v1?route=artifacts` — artifacts list

## Implementation

### 1. Create Edge Function: `supabase/functions/api-v1/index.ts`
Single edge function handling all v1 routes. Logic:
- Extract `Authorization: Bearer gv_live_...` header
- SHA-256 hash the token, look up in `api_keys` table using service role client
- Verify not revoked, check scopes
- Route based on `route` query param
- Query the relevant tables scoped to `user_id` from the API key
- Return JSON

This mirrors the FastAPI `v1.py` logic exactly, but runs on Lovable Cloud infrastructure.

### 2. Add to `supabase/config.toml`
```
[functions.api-v1]
verify_jwt = false
```
Must be false since external callers use API keys, not JWTs.

### 3. Test with `curl_edge_functions`
Validate the function deploys and responds correctly.

### 4. Generate Shane's API Key
Use the existing Connections panel or generate one directly, then provide Shane with:
- The base URL
- His API key
- Example curl commands

## Files Changed
| File | Change |
|------|--------|
| `supabase/functions/api-v1/index.ts` | New — public API edge function |
| `supabase/config.toml` | Add `[functions.api-v1]` block |

No frontend changes needed. No new tables.

