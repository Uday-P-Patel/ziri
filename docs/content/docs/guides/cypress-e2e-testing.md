---
title: End-to-end testing with Cypress
weight: 90
---

Ziri ships with a full end-to-end Cypress flow that drives the **UI only** (no direct API calls) and exercises all dashboard roles.

### Prerequisites

- Node and pnpm/npm installed.
- Dev stack runs locally:

```bash
npm install
npm run dev
```

By default this starts:

- UI at `https://localhost:3000`
- Proxy at `https://localhost:3100`

You can also run everything over plain HTTP; see the SSL/HTTPS docs.

### Environment variables

Set a stable root key and wire it into Cypress:

```bash
# shell / PowerShell syntax
export ZIRI_ROOT_KEY="ziri-e2e-root-key"
export ZIRI_ENCRYPTION_KEY="ziri-e2e-encryption-key-32-bytes!!"

export CYPRESS_ZIRI_USERNAME="ziri"
export CYPRESS_ZIRI_ROOT_KEY="$ZIRI_ROOT_KEY"

# Single URL for UI + proxy (HTTP or HTTPS both work)
export CYPRESS_GATEWAY_URL="https://localhost:3000"
```

- If `CYPRESS_ZIRI_ROOT_KEY` is set, the main spec will **log in as `ziri` automatically** via the UI.
- If it is not set, the spec will pause on `/login` and wait for manual login in the Cypress browser.

### Running the tests

From the repo root, in a second terminal while `npm run dev` is running:

```bash
# run all configured specs headless
npm run e2e:hybrid

# run only the full kickoff flow headless
npm run e2e:kickoff

# open Cypress UI and run the kickoff flow interactively
npm run e2e:kickoff:open
```

- Spec location: `packages/ui/cypress/e2e/full-kickoff.cy.ts`
- Runner script: `scripts/e2e-hybrid.mjs`

### What the full kickoff flow covers

- **Ziri admin seed flows**
  - Users: create users with/without keys, search, sort, full CRUD.
  - Keys: create, disable/enable, rotate, delete.
  - Policies: create from template, update, disable, delete.
  - Providers: add + test + delete provider.
  - Roles, Config, Schema: basic sanity checks.

- **Dashboard roles**
  - Creates dashboard users for: `viewer`, `user_admin`, `policy_admin`, `admin`.
  - Logs in as each role and:
    - Visits only pages that should be visible.
    - Asserts write actions are **present** when allowed and **hidden/disabled** when not.
    - For write-capable roles, performs full CRUD on their allowed pages.

- **Cleanup**
  - Deletes all test dashboard users, seed users, keys, policies and roles created by the spec so successive runs stay clean.

