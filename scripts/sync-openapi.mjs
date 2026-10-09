#!/usr/bin/env node
/**
 * Build `openapi.json` for these docs from the live Storiza API spec.
 *
 *   node scripts/sync-openapi.mjs                 # from https://api.storiza.store/swagger.json
 *   node scripts/sync-openapi.mjs ./swagger.json  # from a file
 *
 * Keeps only what a customer can call with an API key (or without one, for
 * the public catalog), drops the dashboard's session-only and staff routes,
 * regroups the tags into the sidebar in `openapi-rules.mjs`, and removes the
 * schemas nothing published refers to. It also rewrites the API Reference
 * sidebar in `docs.json` — one group per section, every endpoint listed — so
 * the navigation can never drift from the spec. Run it whenever the API
 * changes and commit both files; Mintlify reads what is committed.
 */
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  DESCRIPTION_REWRITES,
  EXCLUDED_OPERATIONS,
  EXCLUDED_TAGS,
  GROUPS,
  PUBLIC,
  SELF_AUTHENTICATED,
} from "./openapi-rules.mjs";

const SOURCE = "https://api.storiza.store/swagger.json";
const SERVER = "https://api.storiza.store";
const METHODS = ["get", "post", "put", "patch", "delete"];
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "openapi.json");
const DOCS_JSON = path.join(ROOT, "docs.json");
const API_TAB = "API Reference";
const METHOD_ORDER = { get: 0, post: 1, put: 2, patch: 3, delete: 4 };

const load = async (source) => {
  if (/^https?:/.test(source)) {
    const response = await fetch(source);
    if (!response.ok) throw new Error(`${source} answered ${response.status}`);
    return response.json();
  }
  return JSON.parse(await readFile(source, "utf8"));
};

const usesApiKey = (op) => (op.security ?? []).some((entry) => "bearerAuth" in entry);
const matchesAny = (patterns, value) => patterns.some((pattern) => pattern.test(value));

const isExcluded = (method, route, op) =>
  (op.tags ?? []).some((tag) => EXCLUDED_TAGS.has(tag)) ||
  EXCLUDED_OPERATIONS.some(([m, pattern]) => (m === "*" || m === method.toUpperCase()) && pattern.test(route));

/** Path rules win over tag rules, so a firewall route lands in "Server firewall", not "Servers". */
const groupFor = (route, op) =>
  GROUPS.find((group) => group.match?.test(route)) ??
  GROUPS.find((group) => group.tags?.some((tag) => (op.tags ?? []).includes(tag)));

const permissionFor = (method) => (method === "get" ? "vps:read" : "vps:write");

/**
 * The spec's description ends with notes written for every caller, the
 * dashboard included. Here only API keys matter: the transport list goes and
 * the permission stays.
 */
const describe = (description = "", permission) => {
  const cleaned = DESCRIPTION_REWRITES.reduce((text, [pattern, replacement]) => text.replace(pattern, replacement), description);
  const body = cleaned
    .replace(/\n*\*\*Authentication:\*\*[^\n]*/g, "")
    .replace(/\n*\*\*API key permission:\*\*[^\n]*/g, "")
    .trim();
  const note = permission
    ? `**Required API key permission:** \`${permission}\``
    : "**No API key needed** — this endpoint is public.";
  return [body, note].filter(Boolean).join("\n\n");
};

const existingPermission = (description = "") =>
  description.match(/\*\*API key permission:\*\*\s*`([^`]+)`/)?.[1] ?? null;

/** Every `#/components/...` reference reachable from `value`. */
const collectRefs = (value, found = new Set()) => {
  if (Array.isArray(value)) value.forEach((item) => collectRefs(item, found));
  else if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      if (key === "$ref" && typeof child === "string") found.add(child);
      else collectRefs(child, found);
    }
  }
  return found;
};

const pruneComponents = (spec) => {
  const schemas = spec.components?.schemas ?? {};
  const keep = new Set();
  const queue = [...collectRefs(spec.paths)];
  while (queue.length) {
    const ref = queue.pop();
    const name = ref.replace("#/components/schemas/", "");
    if (keep.has(name) || !schemas[name]) continue;
    keep.add(name);
    queue.push(...collectRefs(schemas[name]));
  }
  spec.components.schemas = Object.fromEntries(Object.entries(schemas).filter(([name]) => keep.has(name)));
  return keep.size;
};

const main = async () => {
  const source = process.argv[2] ?? SOURCE;
  const spec = await load(source);
  const paths = {};
  const dropped = [];
  let kept = 0;

  for (const [route, item] of Object.entries(spec.paths)) {
    for (const method of METHODS) {
      const op = item[method];
      if (!op) continue;

      const bearer = usesApiKey(op);
      const selfAuth = !bearer && matchesAny(SELF_AUTHENTICATED, route);
      const isPublic = !bearer && !selfAuth && matchesAny(PUBLIC, route) && !op.security?.length;

      if (isExcluded(method, route, op) || !(bearer || selfAuth || isPublic)) {
        dropped.push(`${method.toUpperCase()} ${route}`);
        continue;
      }

      const group = groupFor(route, op);
      if (!group) throw new Error(`No sidebar group for ${method.toUpperCase()} ${route} (tags: ${op.tags})`);

      const permission = isPublic ? null : selfAuth ? permissionFor(method) : existingPermission(op.description);
      paths[route] ??= {};
      paths[route][method] = {
        ...op,
        tags: [group.name],
        summary: op.summary?.replace(/\.$/, ""),
        description: describe(op.description, permission),
        security: isPublic ? [] : [{ bearerAuth: [] }],
      };
      kept++;
    }
  }

  const usedGroups = new Set(Object.values(paths).flatMap((item) => Object.values(item).map((op) => op.tags[0])));
  const out = {
    openapi: spec.openapi,
    info: {
      title: "Storiza API",
      version: "1.0",
      description: "Manage Storiza servers, apps, billing and your account programmatically.",
    },
    servers: [{ url: SERVER }],
    security: [{ bearerAuth: [] }],
    tags: GROUPS.filter((group) => usedGroups.has(group.name)).map(({ name, description }) => ({ name, description })),
    paths,
    components: {
      ...spec.components,
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          description:
            "An API key from the Storiza dashboard (API & Integrations → API keys), sent as `Authorization: Bearer stz_…`.",
        },
      },
    },
  };
  const schemas = pruneComponents(out);

  await writeFile(OUT, `${JSON.stringify(out, null, 2)}\n`);
  await writeNavigation(out);
  console.log(`openapi.json: ${kept} operations in ${usedGroups.size} groups, ${schemas} schemas (from ${source})`);
  if (process.env.VERBOSE) console.log(`dropped:\n  ${dropped.join("\n  ")}`);
};

/** The API Reference tab: the overview page, then each group's endpoints as `METHOD /path`. */
const writeNavigation = async (spec) => {
  const docs = JSON.parse(await readFile(DOCS_JSON, "utf8"));
  const tab = docs.navigation.tabs.find((candidate) => candidate.tab === API_TAB);
  if (!tab) throw new Error(`docs.json has no "${API_TAB}" tab`);

  const byGroup = new Map(spec.tags.map((tag) => [tag.name, []]));
  for (const [route, item] of Object.entries(spec.paths)) {
    for (const [method, op] of Object.entries(item)) byGroup.get(op.tags[0]).push({ method, route });
  }

  tab.openapi = "openapi.json";
  tab.groups = [
    { group: "Overview", pages: ["api-reference/introduction"] },
    ...[...byGroup].map(([group, operations]) => ({
      group,
      pages: operations
        .sort((a, b) => a.route.localeCompare(b.route) || METHOD_ORDER[a.method] - METHOD_ORDER[b.method])
        .map(({ method, route }) => `${method.toUpperCase()} ${route}`),
    })),
  ];
  delete tab.pages;
  await writeFile(DOCS_JSON, `${JSON.stringify(docs, null, 2)}\n`);
};

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
