/**
 * Which parts of the Storiza API are published in these docs, and how they are
 * grouped. The full spec at https://api.storiza.store/swagger.json also covers
 * the dashboard's own session routes and staff tooling; customers can call
 * neither with an API key, so neither belongs in a customer reference.
 */

/** Whole tags that never reach a customer's API key. */
export const EXCLUDED_TAGS = new Set([
  "Admin",
  "AI", // the dashboard assistant, session only
  "API Keys", // keys are managed in the dashboard; a key cannot mint keys
  "Auth",
  "OAuth",
  "MCP", // documented as a guide, not as REST
  "Reseller Account", // a reseller's customers sign in to the storefront, not here
  "Reseller Admin",
]);

/** Individual operations left out: [method or "*", path pattern]. */
export const EXCLUDED_OPERATIONS = [
  ["*", /^\/webhooks\//], // payment providers call these
  ["*", /^\/vps\/abuse/], // abuse tooling, its own header auth
  ["*", /^\/vps\/admin-create$/],
  ["*", /\/admin-(details|renew)$/],
  ["GET", /^\/(vps-plans|vps-datacenters|vps-backup-plans)\/stats$/], // staff counters
  ["GET", /^\/vps-plans\/$/], // includes hidden plans; customers use /vps-plans/public
  ["POST", /^\/apps-nodes\/\{id\}\/install$/], // node operations
  ["PATCH", /^\/support\/tickets\/\{id\}$/], // staff triage
  ["GET", /^\/resources\/ui$/], // dashboard banners
  ["GET", /^\/reseller\/store\/(by-domain|legal)\//], // read by storefronts
  // Sockets and streams: a playground cannot open them. See guides/realtime.
  ["GET", /\/(attach|terminal|files\/live|metrics\/stream|provision\/watch|console)$/],
  ["POST", /\/console\/token$/],
  // Acknowledged but not carried out yet — publish once a restore really runs.
  ["POST", /^\/vps\/\{vpsId\}\/(backups\/\{backupId\}|snapshots\/\{snapshotId\})\/restore$/],
];

/**
 * Wording in the API's own descriptions that is about how Storiza works
 * inside, not about using it: analytics, and the virtualisation software.
 * Applied in order.
 */
export const DESCRIPTION_REWRITES = [
  [/\s*A Facebook ViewContent event is recorded best-effort\./g, ""],
  [/, and records a ViewContent tracking event/g, ""],
  [/from Proxmox and from the database/g, "from storage"],
  [/\b(?:the|a) Proxmox (\w)/g, "the $1"],
  [/ via Proxmox/g, ""],
  [/\bProxmox\b/g, "the hypervisor"],
];

/**
 * Routes that authenticate themselves — they also accept a VPS share token —
 * so the spec carries no `security` for them. They take an API key like any
 * other, needing `vps:read` to read and `vps:write` for anything else.
 */
export const SELF_AUTHENTICATED = [/^\/vps\/$/, /^\/vps\/\{vmId\}(\/.*)?$/, /^\/vps\/firewall\/presets$/];

/** Open to anyone — the catalog a pricing page is built from. No key needed. */
export const PUBLIC = [
  /^\/vps-plans\/(public|\{id\})$/,
  /^\/vps-(templates|categories)\/$/,
  /^\/vps-datacenters\/(\{datacenterId\}\/)?$/,
  /^\/vps-backup-plans\/(\{id\})?$/,
  /^\/apps-(plans|templates)\/$/,
  /^\/payments\/currencies$/,
  /^\/vps\/validate$/,
];

/**
 * Sidebar groups, in order. The first rule whose pattern matches an
 * operation's path decides its group; `match` is tested against the path,
 * `tags` against the spec's own tag.
 */
export const GROUPS = [
  { name: "Servers", description: "Create, order, renew, upgrade and delete VPS instances, and read their details.", tags: ["VPS"] },
  { name: "Server power & commands", description: "Start, stop, reboot and kill a server, check its status and run commands on it.", match: /^\/vps\/\{vmId\}\/(start|stop|reboot|kill|status|execute)$/ },
  { name: "Server settings", description: "Rename a server, reinstall its operating system and watch provisioning.", match: /^\/vps\/\{vmId\}\/(info|reinstall|provision)$/ },
  { name: "Server firewall", description: "Rules, presets and policies for a server's firewall.", match: /^\/vps\/(\{vmId\}\/)?firewall/ },
  { name: "Server metrics", description: "CPU, memory, disk and network usage, current and historical, plus alerts.", match: /^\/vps\/\{vmId\}\/metrics/ },
  { name: "Server backups", description: "Backups of a server, and ordering the backup add-on.", match: /^\/vps\/\{(vpsId|id)\}\/backups/ },
  { name: "Server snapshots", description: "Point-in-time snapshots you can roll a server back to.", match: /^\/vps\/\{vpsId\}\/snapshots/ },
  { name: "Server sharing", description: "Share a server with other people, or through a share link.", match: /^\/vps\/(\{(vpsId|vmId)\}\/(members|share)|validate)/ },
  { name: "Server catalog", description: "Plans, operating systems, categories, datacenters and backup plans. Public.", match: /^\/vps-(plans|templates|categories|datacenters|backup-plans)\// },

  { name: "Apps", description: "Deploy, order, renew, configure and delete apps — game servers, databases and bots.", tags: ["Apps"] },
  { name: "App lifecycle & console", description: "Start, stop, restart and kill an app, read its logs and metrics, and run commands in it.", match: /^\/apps\/\{id\}\/(lifecycle|logs|metrics|exec|stdin)/ },
  { name: "App files", description: "Browse, read, write, move and delete the files in an app's volume, and its SFTP access.", match: /^\/apps\/\{id\}\/(files|sftp)/ },
  { name: "App backups", description: "Back up an app and restore it.", tags: ["App Backups"] },
  { name: "App domains & ports", description: "How an app is reached: hostnames and ports.", tags: ["App Exposures"] },
  { name: "App groups", description: "Private networks that let your apps reach each other by hostname.", match: /^\/(apps-groups|apps\/\{id\}\/group)/ },
  { name: "App catalog", description: "Templates, plans and the nodes apps run on.", match: /^\/apps-(plans|templates|nodes)/ },

  { name: "Subscriptions", description: "What you pay for, how often, and how it renews.", match: /^\/payments\/subscriptions/ },
  { name: "Transactions & invoices", description: "Payments, their status and their invoices.", match: /^\/payments\/transactions/ },
  { name: "Billing", description: "Top up your balance, list payment methods and currencies, and check coupons.", tags: ["Payments"] },
  { name: "Gift cards", description: "Buy, redeem and manage gift cards.", tags: ["Gift Cards"] },

  { name: "Account", description: "Your profile and a summary of everything you own.", match: /^\/(profile|resources)\// },
  { name: "SSH keys", description: "Public keys that can be installed on new servers.", tags: ["SSH Keys"] },
  { name: "Managed users", description: "People you give access to some of your servers.", tags: ["Managed Users"] },
  { name: "Support", description: "Open support tickets and talk to the team.", tags: ["Support"] },
  { name: "Reseller", description: "The reseller program: your store and your customers' accounts.", tags: ["Reseller", "Reseller Accounts"] },
];
