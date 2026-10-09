/**
 * What the public docs publish, and how it is grouped.
 *
 * **An allow-list, not a block-list.** The API carries far more than a
 * customer can use with a key: staff tools, dashboard-only routes, features
 * the dashboard does not offer customers (deleting a server, managed users),
 * and endpoints that answer but do nothing yet. Only what is listed here is
 * published, so a new endpoint stays private until someone decides it belongs
 * in the customer API and adds it.
 *
 * The rule each entry follows: a customer can do it in the dashboard (or it
 * is the API's own way of doing what the dashboard console does), and an API
 * key can call it. `sync-openapi.mjs` refuses to publish an entry a key
 * cannot call.
 */

/** Every published operation, by sidebar group, in sidebar order. */
export const PUBLISHED = {
  Servers: {
    description: "Create, order, renew and upgrade VPS servers, and read their details.",
    operations: [
      "GET /vps/",
      "GET /vps/{vmId}",
      "POST /vps/",
      "POST /vps/order",
      "POST /vps/{id}/renew",
      "POST /vps/{id}/upgrade",
    ],
  },
  "Server power & commands": {
    description: "Start, stop, reboot and force-stop a server, check its status and run commands on it.",
    operations: [
      "POST /vps/{vmId}/start",
      "POST /vps/{vmId}/stop",
      "POST /vps/{vmId}/reboot",
      "POST /vps/{vmId}/kill",
      "GET /vps/{vmId}/status",
      "POST /vps/{vmId}/execute",
    ],
  },
  "Server settings": {
    description: "Rename a server, reinstall its operating system and follow its installation.",
    operations: ["PUT /vps/{vmId}/info", "POST /vps/{vmId}/reinstall", "GET /vps/{vmId}/provision"],
  },
  "Server firewall": {
    description: "Turn a server's firewall on or off and manage its rules.",
    operations: [
      "GET /vps/{vmId}/firewall",
      "PUT /vps/{vmId}/firewall/toggle",
      "POST /vps/{vmId}/firewall/rules",
      "DELETE /vps/{vmId}/firewall/rules/{ruleId}",
      "GET /vps/firewall/presets",
    ],
  },
  "Server metrics": {
    description: "CPU, memory, disk and network usage, now and over time.",
    operations: ["GET /vps/{vmId}/metrics/current", "GET /vps/{vmId}/metrics/historical"],
  },
  "Server backups": {
    description: "Order the backup add-on, and take, list and delete backups.",
    operations: [
      "POST /vps/{id}/backups/order",
      "GET /vps/{vpsId}/backups",
      "POST /vps/{vpsId}/backups",
      "DELETE /vps/{vpsId}/backups/{backupId}",
    ],
  },
  "Server snapshots": {
    description: "Take, list and delete snapshots of a server.",
    operations: [
      "GET /vps/{vpsId}/snapshots",
      "POST /vps/{vpsId}/snapshots",
      "DELETE /vps/{vpsId}/snapshots/{snapshotId}",
    ],
  },
  "Server sharing": {
    description: "A share link that lets someone else open the server.",
    operations: ["GET /vps/{vmId}/share", "POST /vps/{vmId}/share/generate"],
  },
  "Server catalog": {
    description: "Plans, operating systems, categories, datacenters and backup plans. Public — no key needed.",
    operations: [
      "GET /vps-plans/public",
      "GET /vps-categories/",
      "GET /vps-templates/",
      "GET /vps-datacenters/",
      "GET /vps-backup-plans/",
    ],
  },

  Apps: {
    description: "Deploy, order, renew and configure apps — game servers, databases and bots.",
    operations: [
      "GET /apps/",
      "GET /apps/{id}",
      "POST /apps/",
      "POST /apps/order",
      "PATCH /apps/{id}",
      "PATCH /apps/{id}/environment",
      "PATCH /apps/{id}/command",
      "POST /apps/{id}/command/preview",
      "POST /apps/{id}/reinstall",
      "POST /apps/{id}/renew",
    ],
  },
  "App lifecycle & console": {
    description: "Start, stop, restart and kill an app, read its output and metrics, and send it commands.",
    operations: [
      "POST /apps/{id}/lifecycle/start",
      "POST /apps/{id}/lifecycle/stop",
      "POST /apps/{id}/lifecycle/restart",
      "POST /apps/{id}/lifecycle/kill",
      "GET /apps/{id}/logs",
      "GET /apps/{id}/metrics",
      "POST /apps/{id}/exec",
      "POST /apps/{id}/stdin",
    ],
  },
  "App files": {
    description: "Read, write, move and delete the files in an app's volume, and its SFTP access.",
    operations: [
      "GET /apps/{id}/files",
      "GET /apps/{id}/files/text",
      "GET /apps/{id}/files/content",
      "PUT /apps/{id}/files/content",
      "POST /apps/{id}/files/mkdir",
      "POST /apps/{id}/files/move",
      "POST /apps/{id}/files/copy",
      "DELETE /apps/{id}/files",
      "GET /apps/{id}/sftp",
      "POST /apps/{id}/sftp/enable",
      "POST /apps/{id}/sftp/disable",
      "POST /apps/{id}/sftp/regenerate",
    ],
  },
  "App backups": {
    description: "Back up an app, download a backup, and restore from one.",
    operations: [
      "GET /apps/{id}/backups",
      "POST /apps/{id}/backups",
      "DELETE /apps/{id}/backups/{backupId}",
      "GET /apps/{id}/backups/{backupId}/download",
      "GET /apps/{id}/restores",
      "POST /apps/{id}/restores",
    ],
  },
  "App domains": {
    description: "Your own domains for an app, and their DNS verification.",
    operations: [
      "GET /apps/{id}/exposures",
      "POST /apps/{id}/exposures",
      "PATCH /apps/{id}/exposures/{exposureId}",
      "DELETE /apps/{id}/exposures/{exposureId}",
      "POST /apps/{id}/exposures/{exposureId}/verify",
    ],
  },
  "App groups": {
    description: "Private networks that let your apps reach each other by hostname.",
    operations: ["GET /apps-groups/", "POST /apps-groups/", "GET /apps/{id}/group", "PUT /apps/{id}/group"],
  },
  "App catalog": {
    description: "Templates, plans and locations for apps.",
    operations: ["GET /apps-templates/", "GET /apps-plans/", "GET /apps-nodes/"],
  },

  Subscriptions: {
    description: "What you pay for, how often it renews, and stopping or resuming it.",
    operations: [
      "GET /payments/subscriptions",
      "GET /payments/subscriptions/{id}",
      "PATCH /payments/subscriptions/{id}/period",
      "DELETE /payments/subscriptions/{id}",
      "POST /payments/subscriptions/{id}",
      "GET /payments/subscriptions/{id}/manage",
    ],
  },
  Payments: {
    description: "Follow a payment after an order, and the methods and currencies you can pay with.",
    operations: [
      "GET /payments/transactions",
      "GET /payments/transactions/{id}",
      "GET /payments/transactions/{id}/status",
      "GET /payments/methods",
      "GET /payments/currencies",
    ],
  },

  Account: {
    description: "Your profile, and a summary of everything you own.",
    operations: ["GET /profile/information", "GET /resources/summary", "GET /resources/top", "GET /resources/search"],
  },
  "SSH keys": {
    description: "Public keys you can install on new Linux servers.",
    operations: ["GET /sshkeys/", "POST /sshkeys/"],
  },
};

/**
 * Routes that authenticate themselves — they also accept a VPS share token —
 * so the spec carries no `security` for them. They take an API key like any
 * other, needing `vps:read` to read and `vps:write` for anything else.
 */
export const SELF_AUTHENTICATED = [/^\/vps\/$/, /^\/vps\/\{vmId\}(\/.*)?$/, /^\/vps\/firewall\/presets$/];

/** Open to anyone — the catalog a pricing page is built from. No key needed. */
export const PUBLIC = [
  /^\/vps-plans\/public$/,
  /^\/vps-(templates|categories|datacenters|backup-plans)\/$/,
  /^\/apps-(plans|templates)\/$/,
  /^\/payments\/currencies$/,
];

/**
 * Wording in the API's own descriptions that is about how Storiza works
 * inside, not about using it. Applied in order.
 */
export const DESCRIPTION_REWRITES = [
  // Analytics.
  [/\s*A Facebook ViewContent event is recorded best-effort\./g, ""],
  [/, and records a ViewContent tracking event/g, ""],
  // The virtualisation software.
  [/from Proxmox and from the database/g, "from storage"],
  [/\b(?:the|a) Proxmox (\w)/g, "the $1"],
  [/ via Proxmox/g, ""],
  [/\bProxmox\b/g, "the hypervisor"],
  // Features the docs do not publish: gift cards, staff grants, share tokens
  // and reseller sub-accounts.
  [/\s*Gift cards are excluded — they need a code, so they are redeemed at `POST \/giftcards\/redeem` rather than chosen here\./g, ""],
  [/\s*To give time away without anyone paying, use `POST \/vps\/:vmId\/admin-renew` instead\./g, ""],
  [/\s*Supports session auth and shareToken auth(; the action is audit-logged for session actors)?\./g, ""],
  [/Lists the VPS instances visible to the current actor: a user sees the VPS they own, a reseller sub-account sees only the VPS assigned to it\./g, "Lists the VPS servers you own."],
  [/\s*Accessible to the VPS owner, an admin, or a reseller sub-account the VPS is assigned to\./g, ""],
  [/; any authenticated actor \(user or reseller sub-account\) may read it/g, ""],
  // What staff accounts can additionally do is not the customer's concern.
  [/\s*An \*\*admin\*\* may call it on any server, and the money still comes off the admin's own balance — [^.]*\. The customer's subscription stays billed exactly as it was; only the period moves\./g, ""],
  [/\s*Normally only the owner can call this\./g, ""],
  [/\s*TENANT keys create within their own tenant; ADMIN keys must pass ownerId\./g, ""],
  [/; admins see every \w+\./g, "."],
  [/\bNon-admins see only nodes that are ready and accepting apps\./g, "Only nodes that are ready and accepting apps are listed."],
  [/\s*Admins see every node, plus its connection details and install diagnostics\./g, ""],
  [/\s*Admins may back up any VPS; other users only their own\./g, ""],
  [/\s*\(admins may [^)]*\)/g, ""],
];

/** Request fields only staff may send, removed from the published request bodies. */
export const HIDDEN_REQUEST_FIELDS = {
  "POST /apps-groups/": ["ownerId"],
};

/**
 * The relations each endpoint loads, and so sends **in full** — everything
 * else comes back as `{ "id": … }`. Read from the handlers (`include:` /
 * `findAccessibleApp(..., [...])` / `getVPSWithAuth`); update this when one
 * of them changes. Their examples are rebuilt with these relations expanded.
 */
export const EXPANDED_RELATIONS = {
  "GET /vps/": ["ip", "template", "owner", "subscription", "backupSubscription"],
  "GET /vps/{vmId}": ["plan", "template", "datacenter", "ip", "owner", "subscription", "backupSubscription"],
  "GET /apps/": ["subscription", "node", "template", "plan", "group"],
  "GET /apps/{id}": ["subscription", "node", "template", "plan", "group"],
};
