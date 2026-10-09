# Storiza Docs

The public documentation for Storiza — guides and the API reference — built with [Mintlify](https://mintlify.com).

## Layout

```
docs.json                 Site configuration and navigation
index.mdx                 What Storiza is
quickstart.mdx            First API call
authentication.mdx        API keys and permissions
concepts/                 Responses and errors, pagination, billing
guides/                   VPS, apps, files and consoles, streams, AI agents, support
api-reference/            The API overview page
openapi.json              The published API — GENERATED, do not edit by hand
scripts/sync-openapi.mjs  Regenerates openapi.json and the API sidebar
scripts/openapi-rules.mjs What is published, and how it is grouped
logo/, favicon.svg        Brand assets
```

## Preview locally

```bash
npm i -g mint
mint dev
```

Then open http://localhost:3000. Before pushing, `mint broken-links` and `mint validate` catch broken links and an invalid spec.

## Updating the API reference

The reference is built from the live API's spec, `https://api.storiza.store/swagger.json`, filtered to what customers can call:

```bash
node scripts/sync-openapi.mjs                 # from the live API
node scripts/sync-openapi.mjs ./swagger.json  # from a saved file
VERBOSE=1 node scripts/sync-openapi.mjs       # also list what was left out
```

It rewrites `openapi.json` **and** the API Reference sidebar in `docs.json`. Commit both. Node 18 or later, no dependencies.

What gets published is decided in `scripts/openapi-rules.mjs`:

- An endpoint is published when an **API key** can call it, or when it is **public** (the plan and template catalog).
- Staff tools, dashboard-only routes (login, account security, API-key management), webhooks and anything in `EXCLUDED_OPERATIONS` are left out.
- WebSocket and streaming endpoints are left out of the reference — a playground cannot open them — and documented in `guides/realtime.mdx`.
- `GROUPS` decides the sidebar sections and their order. A new endpoint that matches no group stops the script with an error, so nothing is published unplaced.
- `DESCRIPTION_REWRITES` removes wording about internals from the API's own descriptions.

## Deploying

Connect this repository in the [Mintlify dashboard](https://dashboard.mintlify.com) — every push to the default branch deploys. To serve the docs at your own domain, add it under **Settings → Custom domain** and point a CNAME at Mintlify.
