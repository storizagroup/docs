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

What gets published is decided in `scripts/openapi-rules.mjs`, and it is an **allow-list**:

- `PUBLISHED` lists every endpoint in the reference, grouped and ordered exactly as the sidebar shows them. Nothing else in the API is published — staff tools, dashboard-only routes, features customers do not have (deleting a server or an app, managed users), support tickets, the reseller program and the checkout flows (top-ups, gift cards, coupons, paying a transaction) all stay private.
- A new API endpoint is **not** published until someone adds it to `PUBLISHED`. `VERBOSE=1` lists everything left out, to review.
- The script stops without writing anything if a listed endpoint has disappeared from the API, or cannot be called with an API key.
- `PUBLIC` marks the catalog endpoints that need no key; `SELF_AUTHENTICATED` the VPS routes that take a key although the spec does not say so.
- `DESCRIPTION_REWRITES` and `HIDDEN_REQUEST_FIELDS` remove wording and fields about internals and staff-only behaviour from the API's own descriptions.
- WebSocket and streaming endpoints are documented in `guides/realtime.mdx` instead — a playground cannot open them.

## Deploying

Connect this repository in the [Mintlify dashboard](https://dashboard.mintlify.com) — every push to the default branch deploys. To serve the docs at your own domain, add it under **Settings → Custom domain** and point a CNAME at Mintlify.
