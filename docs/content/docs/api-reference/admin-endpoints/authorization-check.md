---
title: Authorization Check
weight: 12
---

Endpoints for checking whether the current admin user is authorized to perform specific dashboard actions. These use the internal Cedar policy engine.

## Check Single Action

```
POST /api/authz/check
```

### Authentication

Requires admin Bearer token.

### Request Body

```typescript
{
  action: string           // Required: The action to check (e.g. "list_users", "create_policy")
  resourceType?: string    // Optional: Resource type (default: "dashboard")
  context?: object         // Optional: Additional context for the authorization decision
}
```

### Example Request

```bash
curl -X POST http://localhost:3100/api/authz/check \
  -H "Authorization: Bearer your-admin-token" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "create_policy",
    "resourceType": "dashboard"
  }'
```

### Success Response

```json
{
  "allowed": true,
  "reason": "permit policy matched"
}
```

### Error Responses

| Status | Code              | Description                          |
| ------ | ----------------- | ------------------------------------ |
| 400    | MISSING_ACTION    | `action` field is required           |
| 403    | ENTITY_NOT_FOUND  | Dashboard user entity not found      |
| 500    | INTERNAL_ERROR    | Authorization check failed           |

---

## Batch Check Actions

```
POST /api/authz/check-batch
```

Check multiple actions in a single request.

### Request Body

```typescript
{
  actions: Array<{
    action: string           // Required: Action to check
    resourceType?: string    // Optional: Resource type (default: "dashboard")
  }>
}
```

### Example Request

```bash
curl -X POST http://localhost:3100/api/authz/check-batch \
  -H "Authorization: Bearer your-admin-token" \
  -H "Content-Type: application/json" \
  -d '{
    "actions": [
      { "action": "list_users" },
      { "action": "create_policy" },
      { "action": "delete_provider" }
    ]
  }'
```

### Success Response

```json
{
  "results": [
    { "action": "list_users", "allowed": true },
    { "action": "create_policy", "allowed": true },
    { "action": "delete_provider", "allowed": false }
  ]
}
```

### Error Responses

| Status | Code              | Description                     |
| ------ | ----------------- | ------------------------------- |
| 400    | INVALID_ACTIONS   | `actions` must be an array      |
| 403    | ENTITY_NOT_FOUND  | Dashboard user entity not found |

---

## Available Dashboard Actions

These are the internal Cedar actions that can be checked:

| Category         | Actions                                                                      |
| ---------------- | ---------------------------------------------------------------------------- |
| Users            | `list_users`, `get_user`, `create_user`, `update_user`, `delete_user`, `reset_user_password` |
| Keys             | `list_keys`, `create_key`, `delete_key`, `rotate_key`                        |
| Policies         | `list_policies`, `create_policy`, `update_policy`, `delete_policy`, `patch_policy_status`, `get_policy_templates`, `generate_policy` |
| Entities         | `list_entities`, `update_entity`                                             |
| Roles            | `list_roles`, `create_role`, `delete_role`                                   |
| Schema           | `get_schema`, `update_schema`                                                |
| Providers        | `list_providers`, `get_provider`, `create_provider`, `delete_provider`, `test_provider` |
| Config           | `get_config`, `update_config`                                                |
| Dashboard Users  | `list_dashboard_users`, `get_dashboard_user`, `create_dashboard_user`, `update_dashboard_user`, `delete_dashboard_user`, `reset_dashboard_user_password` |
| Audit & Stats    | `view_audit_logs`, `view_audit_statistics`, `view_stats`, `view_costs`, `view_events`, `view_internal_audit` |
