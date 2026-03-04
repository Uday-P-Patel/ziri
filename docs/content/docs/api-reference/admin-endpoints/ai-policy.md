---
title: AI Policy Generation
weight: 13
---

Use a configured LLM provider to generate Cedar policies from natural language descriptions.

## Generate Policy

```
POST /api/ai-policy/generate
```

### Authentication

Requires admin Bearer token.

### Request Body

```typescript
{
  provider: string      // Required: LLM provider to use (e.g. "openai", "anthropic")
  model: string         // Required: Model to use (e.g. "gpt-4o", "claude-sonnet-4-20250514")
  messages: Array<{     // Required: Conversation messages describing the desired policy
    role: string
    content: string
  }>
  cedarSchema?: string  // Optional: Cedar schema text (defaults to current schema)
}
```

### Example Request

```bash
curl -X POST http://localhost:3100/api/ai-policy/generate \
  -H "Authorization: Bearer your-admin-token" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "openai",
    "model": "gpt-4o",
    "messages": [
      {
        "role": "user",
        "content": "Create a policy that allows the engineering tenant to use completion and embedding actions during business hours (9 AM to 6 PM)"
      }
    ]
  }'
```

### Success Response

```json
{
  "policy": "@id(\"engineering-business-hours\")\npermit (\n  principal,\n  action in [Action::\"completion\", Action::\"embedding\"],\n  resource\n)\nwhen {\n  principal.tenant == \"engineering\" &&\n  context.hour >= 9 &&\n  context.hour < 18\n};",
  "usage": {
    "input_tokens": 1250,
    "output_tokens": 85
  }
}
```

### Error Responses

| Status | Code                    | Description                              |
| ------ | ----------------------- | ---------------------------------------- |
| 400    | MISSING_FIELDS          | `provider`, `model`, and `messages` are required |
| 400    | PROVIDER_NOT_CONFIGURED | The specified provider is not configured |
| 500    | SCHEMA_ERROR            | Failed to retrieve the Cedar schema      |
| 500    | GENERATION_ERROR        | LLM generation failed                   |

### How It Works

1. The system prompt includes the full Cedar grammar specification and your current Cedar schema
2. Your message describes the desired policy in natural language
3. The LLM generates valid Cedar policy syntax based on the schema
4. The response includes the raw policy text ready to be added via the [Policies API](/docs/api-reference/admin-endpoints/policies)

### Tips

- Be specific about entity types, actions, and conditions in your description
- Reference the actual entity names from your schema (e.g., `Action::"completion"`, tenant names)
- Review generated policies before activating them — always test with the audit logs
- The generated policy includes an `@id()` annotation automatically
