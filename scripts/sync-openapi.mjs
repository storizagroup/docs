#!/usr/bin/env node
/**
 * Build `openapi.json` for these docs from the live Storiza API spec.
 *
 *   node scripts/sync-openapi.mjs                 # from https://api.storiza.store/swagger.json
 *   node scripts/sync-openapi.mjs ./swagger.json  # from a file
 *   VERBOSE=1 node scripts/sync-openapi.mjs       # also list everything left unpublished
 *
 * Publishes exactly the operations listed in `openapi-rules.mjs` — nothing
 * else in the spec — and stops with an error if one of them has disappeared
 * from the API or cannot be called with an API key. It also rewrites the API
 * Reference sidebar in `docs.json`, in the order the rules list it. Commit
 * both files; Mintlify reads what is committed.
 */
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  DESCRIPTION_REWRITES,
  HIDDEN_REQUEST_FIELDS,
  PUBLIC,
  PUBLISHED,
  SELF_AUTHENTICATED,
} from "./openapi-rules.mjs";

const SOURCE = "https://api.storiza.store/swagger.json";
const SERVER = "https://api.storiza.store";
const METHODS = ["get", "post", "put", "patch", "delete"];
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "openapi.json");
const DOCS_JSON = path.join(ROOT, "docs.json");
const API_TAB = "API Reference";

const load = async (source) => {
  if (/^https?:/.test(source)) {
    const response = await fetch(source);
    if (!response.ok) throw new Error(`${source} answered ${response.status}`);
    return response.json();
  }
  return JSON.parse(await readFile(source, "utf8"));
};

const matchesAny = (patterns, value) => patterns.some((pattern) => pattern.test(value));

/** "GET /vps/" → the group it is published under. */
const publishedGroup = new Map(
  Object.entries(PUBLISHED).flatMap(([group, { operations }]) => operations.map((key) => [key, group])),
);

/**
 * How an API caller authenticates to this operation, or null when a key
 * cannot reach it at all (dashboard-session routes).
 */
const accessFor = (route, method, op) => {
  if ((op.security ?? []).some((entry) => "bearerAuth" in entry)) {
    return { permission: op.description?.match(/\*\*API key permission:\*\*\s*`([^`]+)`/)?.[1] ?? null };
  }
  if (matchesAny(SELF_AUTHENTICATED, route)) return { permission: method === "get" ? "vps:read" : "vps:write" };
  if (matchesAny(PUBLIC, route) && !op.security?.length) return { permission: null, isPublic: true };
  return null;
};

/**
 * The spec's description ends with notes written for every caller, the
 * dashboard included. Here only API keys matter: the transport list goes and
 * the permission stays.
 */
const describe = (description = "", access) => {
  const body = DESCRIPTION_REWRITES.reduce((text, [pattern, replacement]) => text.replace(pattern, replacement), description)
    .replace(/\n*\*\*Authentication:\*\*[^\n]*/g, "")
    .replace(/\n*\*\*API key permission:\*\*[^\n]*/g, "")
    .trim();
  const note = access.isPublic
    ? "**No API key needed** — this endpoint is public."
    : `**Required API key permission:** \`${access.permission}\``;
  return [body, note].filter(Boolean).join("\n\n");
};

/** Remove staff-only fields from an operation's JSON request body, in place. */
const hideRequestFields = (op, fields) => {
  const schema = op.requestBody?.content?.["application/json"]?.schema;
  if (!schema?.properties || !fields.length) return;
  for (const field of fields) delete schema.properties[field];
  if (schema.required) schema.required = schema.required.filter((name) => !fields.includes(name));
};

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

/** Drop the schemas nothing published refers to — they would document models customers never see. */
const pruneComponents = (spec) => {
  const schemas = spec.components?.schemas ?? {};
  const keep = new Set();
  const queue = [...collectRefs(spec.paths)];
  while (queue.length) {
    const name = queue.pop().replace("#/components/schemas/", "");
    if (keep.has(name) || !schemas[name]) continue;
    keep.add(name);
    queue.push(...collectRefs(schemas[name]));
  }
  spec.components.schemas = Object.fromEntries(Object.entries(schemas).filter(([name]) => keep.has(name)));
  return keep.size;
};

/** The API Reference tab: the overview page, then each group's operations as `METHOD /path`. */
const writeNavigation = async () => {
  const docs = JSON.parse(await readFile(DOCS_JSON, "utf8"));
  const tab = docs.navigation.tabs.find((candidate) => candidate.tab === API_TAB);
  if (!tab) throw new Error(`docs.json has no "${API_TAB}" tab`);

  tab.openapi = "openapi.json";
  tab.groups = [
    { group: "Overview", pages: ["api-reference/introduction"] },
    ...Object.entries(PUBLISHED).map(([group, { operations }]) => ({ group, pages: [...operations] })),
  ];
  delete tab.pages;
  await writeFile(DOCS_JSON, `${JSON.stringify(docs, null, 2)}\n`);
};

const main = async () => {
  const source = process.argv[2] ?? SOURCE;
  const spec = await load(source);
  const paths = {};
  const unpublished = [];
  const problems = [];

  for (const [route, item] of Object.entries(spec.paths)) {
    for (const method of METHODS) {
      const op = item[method];
      if (!op) continue;

      const key = `${method.toUpperCase()} ${route}`;
      const group = publishedGroup.get(key);
      if (!group) {
        unpublished.push(key);
        continue;
      }

      const access = accessFor(route, method, op);
      if (!access) {
        problems.push(`${key} is listed but an API key cannot call it`);
        continue;
      }

      hideRequestFields(op, HIDDEN_REQUEST_FIELDS[key] ?? []);
      paths[route] ??= {};
      paths[route][method] = {
        ...op,
        tags: [group],
        summary: op.summary?.replace(/\.$/, ""),
        description: describe(op.description, access),
        security: access.isPublic ? [] : [{ bearerAuth: [] }],
      };
    }
  }

  const found = new Set(
    Object.entries(paths).flatMap(([route, item]) => Object.keys(item).map((m) => `${m.toUpperCase()} ${route}`)),
  );
  for (const key of publishedGroup.keys()) {
    if (!found.has(key) && !problems.some((problem) => problem.startsWith(key))) {
      problems.push(`${key} is listed but no longer in the API`);
    }
  }
  if (problems.length) throw new Error(`Nothing was written:\n  ${problems.join("\n  ")}`);

  const out = {
    openapi: spec.openapi,
    info: {
      title: "Storiza API",
      version: "1.0",
      description: "Manage Storiza servers, apps and subscriptions programmatically.",
    },
    servers: [{ url: SERVER }],
    security: [{ bearerAuth: [] }],
    tags: Object.entries(PUBLISHED).map(([name, { description }]) => ({ name, description })),
    paths,
    components: {
      ...spec.components,
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          description:
            "An API key from the Storiza dashboard (API & Integrations), sent as `Authorization: Bearer stz_…`.",
        },
      },
    },
  };
  const schemas = pruneComponents(out);

  await writeFile(OUT, `${JSON.stringify(out, null, 2)}\n`);
  await writeNavigation();
  console.log(
    `openapi.json: ${found.size} operations in ${Object.keys(PUBLISHED).length} groups, ${schemas} schemas — ` +
      `${unpublished.length} left unpublished (from ${source})`,
  );
  if (process.env.VERBOSE) console.log(`unpublished:\n  ${unpublished.join("\n  ")}`);
};

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
