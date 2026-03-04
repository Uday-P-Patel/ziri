---
title: Authentication
weight: 90
---

ZIRI uses two authentication mechanisms depending on the type of request:

**API Key Authentication** — for LLM proxy requests (`/api/chat/completions`, `/api/embeddings`, `/api/images`). Pass the key via the `X-API-Key` header.

**Bearer Token Authentication** — for admin and user management endpoints. Obtain a token by logging in via `/api/auth/admin/login` or `/api/auth/login`, then pass it via the `Authorization: Bearer <token>` header.

See the [Authentication API Reference](/docs/api-reference/admin-endpoints/authentication) for endpoint details, token expiration, and refresh token usage.
