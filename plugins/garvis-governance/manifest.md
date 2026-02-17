---
name: garvis-governance
description: Enforce authority hierarchy, role-based access control (RBAC), content governance, and audit logging for all agent actions. Use this skill to check permissions, log operations, manage governed documents/glossary, approve/deny risky commands, or rollback changes.
homepage: https://github.com/jonpearlandpig/gogarvisplugin
metadata:
  openclaw:
    requires:
      - mongodb: "mongodb uri via MONGODB_URI env"
    optional:
      - emergent-llm-proxy: "for any LLM calls if needed"
---

# GARVIS Governance Skill

## Core Purpose
This skill acts as the central authority layer for OpenClaw agents. Before any action (file write, web request, email send, etc.), the agent should consult GARVIS to:
- Verify user/agent role (Admin, Editor, Viewer)
- Check if action complies with governance rules
- Log the intent + outcome immutably
- Approve or deny with reasoning

## How to Use
- Prefix queries with: "garvis check:", "garvis approve:", "garvis log:", or "garvis enforce:"
- Example: "garvis check: can editor delete file report.pdf?"
- For tool calls: use the defined tools below.

## Available Tools

### checkPermission
Checks if current user/role can perform an action.
- Input: action description (string), target (string, e.g. file path or resource)
- Output: { allowed: boolean, reason: string, requiredRole: string }

### logAudit
Records an action in the immutable audit trail.
- Input: actionType (string), details (object), performedBy (string), outcome (string)
- Output: { logId: string, timestamp: string }

### createGovernedDocument
Adds a new document to governed storage with version + approval.
- Input: title (string), content (string), category (string)
- Output: { docId: string, version: number }

(Add more tools here as you implement them in index.ts — e.g. rollback, glossary lookup, etc.)

## Implementation Notes
- Connects to MongoDB via MONGODB_URI env var.
- Audit collection: `audit_log`
- Roles stored in `users` or `roles` collection.
- Extend in `index.ts` with actual handler logic.
