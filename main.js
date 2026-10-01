/* Personal CRM: iCloud-authoritative relationship management for Obsidian. */
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => PersonalCrmPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian7 = require("obsidian");

// src/carddav.ts
var import_obsidian = require("obsidian");
function xmlDecode(value) {
  return value.replace(/&#x([0-9a-f]+);/gi, (_match, code) => String.fromCodePoint(parseInt(code, 16))).replace(/&#(\d+);/g, (_match, code) => String.fromCodePoint(parseInt(code, 10))).replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&").trim();
}
function unescape(value) {
  return value.replace(/\\n/gi, "\n").replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\\\/g, "\\").trim();
}
function unfold(input) {
  const lines = input.replace(/\r/g, "").split("\n");
  const out = [];
  for (const line of lines) {
    if (/^[ \t]/.test(line) && out.length) out[out.length - 1] += line.slice(1);
    else out.push(line);
  }
  return out;
}
function firstTag(input, localName) {
  const escaped = localName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = input.match(new RegExp(`<[^>]*:?${escaped}[^>]*>([\\s\\S]*?)<\\/[^>]*:?${escaped}\\s*>`, "i"));
  return (match == null ? void 0 : match[1]) ? xmlDecode(match[1]) : "";
}
function responseChunks(xml) {
  return [...xml.matchAll(/<(?:[\w-]+:)?response\b[\s\S]*?<\/(?:[\w-]+:)?response\s*>/gi)].map((match) => match[0]);
}
function absoluteHref(href, baseUrl) {
  try {
    return new URL(href, baseUrl).toString();
  } catch (e) {
    return href;
  }
}
function parseVCard(input) {
  var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y;
  const fields = /* @__PURE__ */ new Map();
  for (const line of unfold(input)) {
    const colon = line.indexOf(":");
    if (colon < 0) continue;
    const key = line.slice(0, colon).split(";")[0].toUpperCase();
    const value = unescape(line.slice(colon + 1));
    fields.set(key, [...(_a = fields.get(key)) != null ? _a : [], value]);
  }
  const name = ((_c = (_b = fields.get("N")) == null ? void 0 : _b[0]) != null ? _c : "").split(";");
  const displayName = (_e = (_d = fields.get("FN")) == null ? void 0 : _d[0]) != null ? _e : [name[1], name[0]].filter(Boolean).join(" ") || "Unnamed contact";
  const memberUids = [...(_f = fields.get("MEMBER")) != null ? _f : [], ...(_g = fields.get("X-ADDRESSBOOKSERVER-MEMBER")) != null ? _g : []].map((value) => value.replace(/^urn:uuid:/i, "").trim()).filter(Boolean);
  return { uid: (_i = (_h = fields.get("UID")) == null ? void 0 : _h[0]) != null ? _i : "", displayName, givenName: (_j = name[1]) != null ? _j : "", familyName: (_k = name[0]) != null ? _k : "", emails: (_l = fields.get("EMAIL")) != null ? _l : [], phones: [...(_m = fields.get("TEL")) != null ? _m : []], organization: (_o = (_n = fields.get("ORG")) == null ? void 0 : _n[0]) != null ? _o : "", addresses: (_p = fields.get("ADR")) != null ? _p : [], websites: (_q = fields.get("URL")) != null ? _q : [], birthday: (_s = (_r = fields.get("BDAY")) == null ? void 0 : _r[0]) != null ? _s : "", notes: (_u = (_t = fields.get("NOTE")) == null ? void 0 : _t.join("\n")) != null ? _u : "", kind: (_y = (_x = (_v = fields.get("KIND")) == null ? void 0 : _v[0]) != null ? _x : (_w = fields.get("X-ADDRESSBOOKSERVER-KIND")) == null ? void 0 : _w[0]) != null ? _y : "", memberUids };
}
function parseContactGroups(resources) {
  return resources.map((resource) => parseVCard(resource.vcardText)).filter((card) => card.kind.toLowerCase() === "group" && card.displayName).map((card) => ({ name: card.displayName, memberUids: card.memberUids }));
}
function parseAddressBooks(xml, baseUrl) {
  const result = [];
  for (const chunk of responseChunks(xml)) {
    const href = firstTag(chunk, "href");
    if (!href || !/<(?:[\w-]+:)?addressbook\b/i.test(chunk)) continue;
    const label = firstTag(chunk, "displayname") || firstTag(chunk, "addressbook-description") || href;
    result.push({ href: absoluteHref(href, baseUrl), label });
  }
  return [...new Map(result.map((item) => [item.href, item])).values()];
}
async function propfind(url, settings, body, depth) {
  const response = await (0, import_obsidian.requestUrl)({ url, method: "PROPFIND", headers: { ...authHeaders(settings), Depth: depth, "Content-Type": "application/xml; charset=utf-8", Accept: "application/xml, text/xml" }, body });
  return response.text;
}
var PRINCIPAL_PROPFIND = `<?xml version="1.0" encoding="UTF-8"?><d:propfind xmlns:d="DAV:" xmlns:cs="http://calendarserver.org/ns/" xmlns:card="urn:ietf:params:xml:ns:carddav"><d:prop><d:current-user-principal/><cs:addressbook-home-set/><d:resourcetype/><d:displayname/></d:prop></d:propfind>`;
var HOME_PROPFIND = `<?xml version="1.0" encoding="UTF-8"?><d:propfind xmlns:d="DAV:" xmlns:card="urn:ietf:params:xml:ns:carddav"><d:prop><d:displayname/><d:resourcetype/></d:prop></d:propfind>`;
async function discoverAddressBooks(settings) {
  var _a, _b;
  const base = settings.carddavUrl.trim();
  if (!base) throw new Error("Enter the iCloud CardDAV discovery URL first.");
  const root = new URL(base).toString();
  const rootXml = await propfind(root, settings, PRINCIPAL_PROPFIND, "0");
  const rootChunk = (_a = responseChunks(rootXml)[0]) != null ? _a : rootXml;
  const principal = firstTag(firstTag(rootChunk, "current-user-principal"), "href");
  const principalUrl = absoluteHref(principal || settings.carddavPrincipalUrl, root);
  if (!principalUrl) throw new Error("iCloud did not return a CardDAV principal URL.");
  const principalXml = await propfind(principalUrl, settings, PRINCIPAL_PROPFIND, "0");
  const principalChunk = (_b = responseChunks(principalXml)[0]) != null ? _b : principalXml;
  const home = firstTag(firstTag(principalChunk, "addressbook-home-set"), "href");
  const homeUrl = absoluteHref(home, principalUrl);
  if (!homeUrl) throw new Error("iCloud did not return an address-book home-set URL.");
  const homeXml = await propfind(homeUrl, settings, HOME_PROPFIND, "1");
  const books = parseAddressBooks(homeXml, homeUrl);
  if (!books.length) throw new Error("No iCloud address books were found under the CardDAV home-set.");
  return books;
}
async function fetchResources(settings) {
  const url = settings.carddavAddressBookUrl.trim();
  if (!url) throw new Error("Discover and select an iCloud address book before syncing.");
  const response = await (0, import_obsidian.requestUrl)({ url, method: "REPORT", headers: { ...authHeaders(settings), Depth: "1", Accept: "application/xml, text/xml, text/vcard", "Content-Type": "application/xml; charset=utf-8" }, body: '<?xml version="1.0"?><c:addressbook-query xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:carddav"><d:prop><d:getetag/><d:getcontenttype/><c:address-data/></d:prop></c:addressbook-query>' });
  const resources = [];
  for (const chunk of responseChunks(response.text)) {
    const href = firstTag(chunk, "href");
    const etag = firstTag(chunk, "getetag");
    const data = firstTag(chunk, "address-data");
    if (href && data) resources.push({ href: absoluteHref(href, url), etag, vcardText: data });
  }
  return resources;
}
function authHeaders(settings) {
  const token = `${settings.username}:${settings.appPassword}`;
  return settings.username && settings.appPassword ? { Authorization: `Basic ${btoa(token)}` } : {};
}

// src/dashboard.ts
var import_obsidian2 = require("obsidian");
var VIEW = "personal-crm-dashboard";
var PersonalCrmView = class extends import_obsidian2.ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
  }
  getViewType() {
    return VIEW;
  }
  getDisplayText() {
    return "Personal CRM";
  }
  getIcon() {
    return "users";
  }
  async onOpen() {
    await this.render();
  }
  async render() {
    const el = this.contentEl;
    el.empty();
    el.addClass("personal-crm-dashboard");
    const contacts = this.plugin.repository.getContacts();
    const active = contacts.filter((c) => c.recordState === "active");
    const conflicts = contacts.filter((c) => c.syncState === "conflict");
    const due = contacts.filter((c) => c.nextContactAt && c.nextContactAt <= (/* @__PURE__ */ new Date()).toISOString());
    const hero = el.createDiv("personal-crm-hero");
    hero.createEl("span", { text: "RED-BEARD \xB7 PERSONAL CRM", cls: "personal-crm-kicker" });
    hero.createEl("h1", { text: "People worth remembering." });
    hero.createEl("p", { text: "iCloud remains authoritative. Obsidian keeps the relationship context readable, reviewable, and connected." });
    const actions = hero.createDiv("personal-crm-actions");
    new import_obsidian2.ButtonComponent(actions).setButtonText("New Contact").setCta().onClick(() => this.plugin.openNewContact());
    new import_obsidian2.ButtonComponent(actions).setButtonText("Sync preview").onClick(() => void this.plugin.syncPreview());
    new import_obsidian2.ButtonComponent(actions).setButtonText("Sync now").onClick(() => void this.plugin.syncNow());
    new import_obsidian2.ButtonComponent(actions).setButtonText("Settings").onClick(() => this.plugin.openSettings());
    const metrics = el.createDiv("personal-crm-metrics");
    [[active.length, "Active contacts"], [contacts.length - active.length, "Inactive"], [due.length, "Follow-ups due"], [conflicts.length, "Conflicts"]].forEach(([value, label]) => {
      const card = metrics.createDiv("personal-crm-metric");
      card.createEl("strong", { text: String(value) });
      card.createEl("span", { text: String(label) });
    });
    const section = el.createDiv("personal-crm-section");
    section.createEl("h2", { text: "People" });
    const search = section.createEl("input", { type: "search", placeholder: "Search contacts\u2026" });
    const grid = section.createDiv("personal-crm-contact-grid");
    const draw = () => {
      grid.empty();
      const query = search.value.toLowerCase();
      contacts.filter((c) => !query || `${c.displayName} ${c.organization} ${c.relationshipType} ${c.tags.join(" ")}`.toLowerCase().includes(query)).forEach((contact) => {
        const card = grid.createDiv("personal-crm-contact-card");
        const header = card.createDiv("personal-crm-contact-header");
        const title = header.createEl("button", { text: contact.displayName, cls: "personal-crm-card-link" });
        title.onclick = () => this.plugin.openContact(contact);
        header.createEl("span", { text: contact.syncState, cls: `personal-crm-chip is-${contact.syncState}` });
        card.createEl("p", { text: [contact.organization, contact.relationshipType].filter(Boolean).join(" \xB7 ") || "No relationship details yet" });
        const row = card.createDiv("personal-crm-card-actions");
        new import_obsidian2.ButtonComponent(row).setButtonText("Open note").onClick(() => this.plugin.openFile(contact.path));
        if (contact.prayerEnabled) new import_obsidian2.ButtonComponent(row).setButtonText("Prayer enabled").onClick(() => void this.plugin.openPrayerPeople());
      });
      if (!grid.children.length) grid.createEl("p", { text: "No CRM contacts yet. Import from iCloud or create a local workspace note." });
    };
    search.oninput = draw;
    draw();
  }
};

// src/dashboard-bridge.ts
function host(app) {
  var _a, _b, _c;
  const plugins = app.plugins;
  return (_c = (_a = plugins == null ? void 0 : plugins.getPlugin) == null ? void 0 : _a.call(plugins, "red-beard-dashboard")) != null ? _c : (_b = plugins == null ? void 0 : plugins.plugins) == null ? void 0 : _b["red-beard-dashboard"];
}
function register(app, method, definition) {
  let dispose = () => void 0;
  let timer;
  let attempts = 0;
  const run = () => {
    var _a;
    const target = host(app);
    const fn = target == null ? void 0 : target[method];
    if (fn) {
      try {
        dispose = (_a = fn(definition)) != null ? _a : (() => void 0);
      } catch (e) {
      }
      if (timer !== void 0) window.clearTimeout(timer);
      return;
    }
    if (attempts++ < 120) timer = window.setTimeout(run, 250);
  };
  run();
  return () => {
    if (timer !== void 0) window.clearTimeout(timer);
    dispose();
  };
}
var registerDashboardModule = (app, definition) => register(app, "registerModule", definition);
var registerDashboardWidget = (app, definition) => register(app, "registerWidget", definition);

// src/modals.ts
var import_obsidian3 = require("obsidian");
var NewContactModal = class extends import_obsidian3.Modal {
  constructor(app, plugin) {
    super(app);
    this.plugin = plugin;
    this.name = "";
  }
  onOpen() {
    this.modalEl.addClass("personal-crm-modal");
    this.contentEl.empty();
    this.setTitle("New contact");
    new import_obsidian3.Setting(this.contentEl).setName("Name").addText((t) => t.onChange((v) => this.name = v));
    new import_obsidian3.Setting(this.contentEl).setName("Privacy").setDesc("This creates an Obsidian workspace note only. It never creates or removes an iCloud contact.");
    new import_obsidian3.Setting(this.contentEl).addButton((b) => b.setButtonText("Save").setCta().onClick(async () => {
      if (!this.name.trim()) {
        new import_obsidian3.Notice("Name is required.");
        return;
      }
      await this.plugin.repository.createLocalContact(this.name);
      new import_obsidian3.Notice("Local CRM workspace created.");
      this.close();
      await this.plugin.refreshViews();
    })).addButton((b) => b.setButtonText("Cancel").onClick(() => this.close()));
  }
};
var ContactDetailModal = class extends import_obsidian3.Modal {
  constructor(app, plugin, contact) {
    super(app);
    this.plugin = plugin;
    this.contact = contact;
  }
  onOpen() {
    this.modalEl.addClass("personal-crm-modal");
    this.contentEl.empty();
    this.setTitle(this.contact.displayName);
    this.contentEl.createEl("p", { text: `${this.contact.syncState} \xB7 ${this.contact.recordState}` });
    this.contentEl.createEl("p", { text: this.contact.emails.join(", ") || "No email" });
    this.contentEl.createEl("p", { text: this.contact.phones.join(", ") || "No phone" });
    this.contentEl.createEl("p", { text: this.contact.notes || "No iCloud Notes content" });
    new import_obsidian3.Setting(this.contentEl).addButton((b) => b.setButtonText("Open note").onClick(() => {
      const file = this.plugin.app.vault.getAbstractFileByPath(this.contact.path);
      if (file instanceof import_obsidian3.TFile) void this.plugin.app.workspace.getLeaf(true).openFile(file);
      this.close();
    })).addButton((b) => b.setButtonText("Close").onClick(() => this.close()));
  }
};

// src/repository.ts
var import_obsidian5 = require("obsidian");

// src/utils.ts
var import_obsidian4 = require("obsidian");
function cleanPath(value, fallback) {
  const cleaned = value.trim().replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
  return (0, import_obsidian4.normalizePath)(cleaned || fallback);
}
function safeName(value) {
  return value.trim().replace(/[\\/:*?"<>|#]/g, "-").replace(/\s+/g, " ").slice(0, 100) || "Unnamed contact";
}
function today() {
  return (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
}
function isoNow() {
  return (/* @__PURE__ */ new Date()).toISOString();
}
function normalizeValue(value) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}
function listValue(value) {
  return Array.isArray(value) ? value.map(String).filter(Boolean) : typeof value === "string" && value.trim() ? [value.trim()] : [];
}
function yamlQuote(value) {
  return JSON.stringify(value);
}

// src/repository.ts
var START = "<!-- red-beard:personal-crm:start -->";
var END = "<!-- red-beard:personal-crm:end -->";
var ContactRepository = class {
  constructor(app, settings) {
    this.app = app;
    this.settings = settings;
  }
  updateSettings(settings) {
    this.settings = settings;
  }
  get root() {
    return cleanPath(this.settings.rootFolder, "Collections/Personal CRM");
  }
  files() {
    return this.app.vault.getMarkdownFiles().filter((file) => file.path.startsWith(`${cleanPath(this.settings.contactsFolder, `${this.root}/Contacts`)}/`));
  }
  fm(file) {
    var _a, _b;
    return (_b = (_a = this.app.metadataCache.getFileCache(file)) == null ? void 0 : _a.frontmatter) != null ? _b : {};
  }
  getContacts() {
    return this.files().map((file) => this.fromFile(file)).filter(Boolean).sort((a, b) => a.displayName.localeCompare(b.displayName));
  }
  fromFile(file) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n, _o, _p;
    const f = this.fm(file);
    return { id: String((_b = (_a = f.contact_id) != null ? _a : f.id) != null ? _b : file.basename), displayName: String((_d = (_c = f.display_name) != null ? _c : f.name) != null ? _d : file.basename), givenName: String((_e = f.given_name) != null ? _e : ""), familyName: String((_f = f.family_name) != null ? _f : ""), emails: listValue(f.emails), phones: listValue(f.phones), organization: String((_g = f.organization) != null ? _g : ""), addresses: listValue(f.addresses), websites: listValue(f.websites), birthday: String((_h = f.birthday) != null ? _h : ""), notes: String((_i = f.icloud_notes) != null ? _i : ""), icloudUid: String((_j = f.icloud_uid) != null ? _j : ""), href: String((_k = f.icloud_href) != null ? _k : ""), etag: String((_l = f.icloud_etag) != null ? _l : ""), syncState: String((_m = f.sync_state) != null ? _m : "new-in-icloud"), recordState: String((_n = f.record_state) != null ? _n : "active") === "inactive" ? "inactive" : "active", relationshipType: String((_o = f.relationship_type) != null ? _o : ""), tags: listValue(f.tags), prayerEnabled: f.prayer_enabled === true || String(f.prayer_enabled).toLowerCase() === "true", prayerCategories: listValue(f.prayer_categories), cadenceDays: f.cadence_days == null || f.cadence_days === "" ? null : Number(f.cadence_days), nextContactAt: String((_p = f.next_contact_at) != null ? _p : ""), path: file.path };
  }
  async initialize() {
    for (const folder of [this.root, this.settings.contactsFolder, this.settings.householdsFolder, this.settings.interactionsFolder, this.settings.reportsFolder, this.settings.syncFolder]) await this.ensureFolder(folder);
  }
  async ensureFolder(path) {
    const normalized = (0, import_obsidian5.normalizePath)(path);
    const existing = this.app.vault.getAbstractFileByPath(normalized);
    if (existing instanceof import_obsidian5.TFolder) return;
    if (existing) throw new Error(`A file already exists at ${normalized}`);
    const parent = normalized.slice(0, normalized.lastIndexOf("/"));
    if (parent) await this.ensureFolder(parent);
    await this.app.vault.createFolder(normalized);
  }
  async createLocalContact(displayName) {
    await this.initialize();
    const id = `CRM-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const path = (0, import_obsidian5.normalizePath)(`${cleanPath(this.settings.contactsFolder, `${this.root}/Contacts`)}/${safeName(displayName)}.md`);
    const unique = this.app.vault.getAbstractFileByPath(path) ? `${path.replace(/\.md$/, "")} ${Date.now()}.md` : path;
    return this.app.vault.create(unique, this.note({ id, displayName, syncState: "changed-locally", recordState: "active", icloudUid: "", href: "", etag: "", givenName: "", familyName: "", emails: [], phones: [], organization: "", addresses: [], websites: [], birthday: "", notes: "", relationshipType: "", tags: [], prayerEnabled: false, prayerCategories: [], cadenceDays: null, nextContactAt: "", path: unique }));
  }
  managedBlock(c) {
    var _a, _b, _c;
    return [START, "## iCloud snapshot", "", `- Name: ${c.displayName}`, `- Email: ${((_a = c.emails) != null ? _a : []).join(", ") || "None"}`, `- Phone: ${((_b = c.phones) != null ? _b : []).join(", ") || "None"}`, `- Organization: ${c.organization || "None"}`, `- Birthday: ${c.birthday || "None"}`, `- Sync state: ${(_c = c.syncState) != null ? _c : "changed-locally"}`, "", "### iCloud Notes", "", c.notes || "_No iCloud Notes content._", END].join("\n");
  }
  replaceManagedBlock(content, block) {
    const start = content.indexOf(START);
    const end = content.indexOf(END);
    if (start >= 0 && end > start) return `${content.slice(0, start)}${block}${content.slice(end + END.length)}`;
    const anchor = content.indexOf("\n## Relationship notes");
    return anchor >= 0 ? `${content.slice(0, anchor)}

${block}${content.slice(anchor)}` : `${content.trimEnd()}

${block}
`;
  }
  note(c) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j;
    const now = isoNow();
    return ["---", "type: personal-crm-contact", "schema_version: 1", `contact_id: ${yamlQuote(c.id)}`, `display_name: ${yamlQuote(c.displayName)}`, `given_name: ${yamlQuote((_a = c.givenName) != null ? _a : "")}`, `family_name: ${yamlQuote((_b = c.familyName) != null ? _b : "")}`, `icloud_uid: ${yamlQuote((_c = c.icloudUid) != null ? _c : "")}`, `icloud_href: ${yamlQuote((_d = c.href) != null ? _d : "")}`, `icloud_etag: ${yamlQuote((_e = c.etag) != null ? _e : "")}`, `sync_state: ${yamlQuote((_f = c.syncState) != null ? _f : "changed-locally")}`, `record_state: ${yamlQuote((_g = c.recordState) != null ? _g : "active")}`, `relationship_type: ${yamlQuote((_h = c.relationshipType) != null ? _h : "")}`, `prayer_enabled: ${c.prayerEnabled === true}`, `prayer_categories: []`, `cadence_days: ${(_i = c.cadenceDays) != null ? _i : "null"}`, `next_contact_at: ${yamlQuote((_j = c.nextContactAt) != null ? _j : "")}`, `created: ${yamlQuote(now)}`, `updated: ${yamlQuote(now)}`, "---", "", `# ${c.displayName}`, "", this.managedBlock(c), "", "## Relationship notes", "", "## Interactions", "", "## Follow-ups", ""].join("\n");
  }
  async syncReadOnly() {
    var _a;
    await this.initialize();
    const resources = await fetchResources(this.settings);
    const groups = parseContactGroups(resources);
    const selectedNames = new Set(this.settings.selectedGroupNames.map((value) => normalizeValue(value)));
    const allowedUids = selectedNames.size ? new Set(groups.filter((group) => selectedNames.has(normalizeValue(group.name))).flatMap((group) => group.memberUids)) : null;
    const existing = this.getContacts();
    const byUid = new Map(existing.filter((c) => c.icloudUid).map((c) => [c.icloudUid, c]));
    let imported = 0, updated = 0, conflicts = 0, failed = 0;
    const seen = /* @__PURE__ */ new Set();
    for (const resource of resources) {
      try {
        const card = parseVCard(resource.vcardText);
        if (card.kind.toLowerCase() === "group" || allowedUids && !allowedUids.has(card.uid)) continue;
        const match = byUid.get(card.uid);
        seen.add((_a = match == null ? void 0 : match.id) != null ? _a : card.uid);
        if (match) {
          if (match.etag && match.etag !== resource.etag) {
            await this.updateFromCard(match, card, resource.href, resource.etag, "changed-in-icloud");
            updated++;
          }
        } else {
          const candidate = existing.find((c) => !c.icloudUid && (normalizeValue(c.displayName) === normalizeValue(card.displayName) || c.emails.some((e) => card.emails.includes(e))));
          if (candidate) {
            conflicts++;
            await this.updateFromCard(candidate, card, resource.href, resource.etag, "conflict");
          } else {
            await this.importCard(card, resource);
            imported++;
          }
        }
      } catch (e) {
        failed++;
      }
    }
    let missing = 0;
    for (const contact of existing.filter((c) => c.icloudUid && c.recordState === "active")) {
      if (!seen.has(contact.id) && !seen.has(contact.icloudUid)) {
        await this.setState(contact, "missing-remotely");
        missing++;
      }
    }
    await this.writeSyncJournal({ imported, updated, conflicts, missing, failed, addressBooks: [] });
    return { imported, updated, conflicts, missing, failed, addressBooks: [] };
  }
  async importCard(card, resource) {
    const folder = cleanPath(this.settings.contactsFolder, `${this.root}/Contacts`);
    const base = (0, import_obsidian5.normalizePath)(`${folder}/${safeName(card.displayName)}.md`);
    let path = base;
    let index = 2;
    while (this.app.vault.getAbstractFileByPath(path)) path = (0, import_obsidian5.normalizePath)(`${folder}/${safeName(card.displayName)} ${index++}.md`);
    await this.app.vault.create(path, this.note({ id: `CRM-${Math.random().toString(36).slice(2, 8).toUpperCase()}`, displayName: card.displayName, givenName: card.givenName, familyName: card.familyName, emails: card.emails, phones: card.phones, organization: card.organization, addresses: card.addresses, websites: card.websites, birthday: card.birthday, notes: card.notes, icloudUid: card.uid, href: resource.href, etag: resource.etag, syncState: "in-sync", recordState: "active", relationshipType: "", tags: [], prayerEnabled: false, prayerCategories: [], cadenceDays: null, nextContactAt: "", path }));
  }
  async updateFromCard(contact, card, href, etag, state) {
    const file = this.app.vault.getAbstractFileByPath(contact.path);
    if (!(file instanceof import_obsidian5.TFile)) return;
    await this.app.fileManager.processFrontMatter(file, (fm) => {
      fm.display_name = card.displayName;
      fm.given_name = card.givenName;
      fm.family_name = card.familyName;
      fm.emails = card.emails;
      fm.phones = card.phones;
      fm.organization = card.organization;
      fm.addresses = card.addresses;
      fm.websites = card.websites;
      fm.birthday = card.birthday;
      fm.icloud_notes = card.notes;
      fm.icloud_uid = card.uid;
      fm.icloud_href = href;
      fm.icloud_etag = etag;
      fm.sync_state = state;
      fm.last_synced = isoNow();
      fm.updated = isoNow();
    });
    const current = await this.app.vault.read(file);
    const next = this.replaceManagedBlock(current, this.managedBlock({ displayName: card.displayName, emails: card.emails, phones: card.phones, organization: card.organization, birthday: card.birthday, notes: card.notes, syncState: state }));
    if (next !== current) await this.app.vault.modify(file, next);
  }
  async setState(contact, state) {
    const file = this.app.vault.getAbstractFileByPath(contact.path);
    if (file instanceof import_obsidian5.TFile) await this.app.fileManager.processFrontMatter(file, (fm) => {
      fm.sync_state = state;
      fm.record_state = "inactive";
      fm.updated = isoNow();
    });
  }
  async writeSyncJournal(result) {
    const folder = cleanPath(this.settings.syncFolder, `${this.root}/Sync`);
    const path = (0, import_obsidian5.normalizePath)(`${folder}/${today()} - sync.json`);
    const content = JSON.stringify({ type: "personal-crm-sync", schema_version: 1, read_only: true, completed: isoNow(), ...result }, null, 2);
    const existing = this.app.vault.getAbstractFileByPath(path);
    if (existing instanceof import_obsidian5.TFile) await this.app.vault.modify(existing, content);
    else await this.app.vault.create(path, content);
  }
};

// src/settings.ts
var import_obsidian6 = require("obsidian");
var PersonalCrmSettingsTab = class extends import_obsidian6.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const e = this.containerEl;
    e.empty();
    e.createEl("h2", { text: "Personal CRM" });
    e.createEl("h3", { text: "Storage" });
    this.text(e, "Root folder", "All CRM notes stay below this folder.", this.plugin.settings.rootFolder, async (v) => {
      this.plugin.settings.rootFolder = v;
      await this.plugin.saveSettings();
    });
    this.text(e, "Contacts folder", "Mirror notes are stored here.", this.plugin.settings.contactsFolder, async (v) => {
      this.plugin.settings.contactsFolder = v;
      await this.plugin.saveSettings();
    });
    e.createEl("h3", { text: "CardDAV / iCloud" });
    this.text(e, "Discovery URL", "Use the iCloud CardDAV host; the address book is resolved during discovery.", this.plugin.settings.carddavUrl, async (v) => {
      this.plugin.settings.carddavUrl = v;
      await this.plugin.saveSettings();
    });
    new import_obsidian6.Setting(e).setName("Discover address books").setDesc(this.plugin.settings.carddavAddressBookLabel ? `Selected: ${this.plugin.settings.carddavAddressBookLabel}` : "Resolve your iCloud principal and choose an address book before syncing.").addButton((b) => b.setButtonText("Discover").setCta().onClick(() => void this.plugin.discoverAddressBooks()));
    new import_obsidian6.Setting(e).setName("Contact lists / groups").setDesc(this.plugin.settings.selectedGroupNames.length ? `Syncing selected: ${this.plugin.settings.selectedGroupNames.join(", ")}` : "All contacts in the selected book; optionally limit sync to one or more groups.").addButton((b) => b.setButtonText("Choose lists").onClick(() => void this.plugin.discoverContactGroups()));
    this.text(e, "Address book URL", "Selected collection URL. Leave blank until discovery completes.", this.plugin.settings.carddavAddressBookUrl, async (v) => {
      this.plugin.settings.carddavAddressBookUrl = v;
      await this.plugin.saveSettings();
    });
    this.text(e, "Username", "iCloud/CardDAV username.", this.plugin.settings.username, async (v) => {
      this.plugin.settings.username = v;
      await this.plugin.saveSettings();
    });
    this.text(e, "App-specific password", "Stored in plugin data and never written to Markdown.", this.plugin.settings.appPassword, async (v) => {
      this.plugin.settings.appPassword = v;
      await this.plugin.saveSettings();
    }, true);
    new import_obsidian6.Setting(e).setName("Scheduled refresh").setDesc("Read-only CardDAV refresh; disabled by default.").addToggle((t) => t.setValue(this.plugin.settings.scheduleEnabled).onChange(async (v) => {
      this.plugin.settings.scheduleEnabled = v;
      await this.plugin.saveSettings();
    }));
    new import_obsidian6.Setting(e).setName("Refresh interval (hours)").addText((t) => t.setValue(String(this.plugin.settings.refreshHours)).onChange(async (v) => {
      this.plugin.settings.refreshHours = Math.max(0, Number(v) || 0);
      await this.plugin.saveSettings();
    }));
    e.createEl("h3", { text: "Prayer integration" });
    new import_obsidian6.Setting(e).setName("Enable prayer links").addToggle((t) => t.setValue(this.plugin.settings.prayerEnabled).onChange(async (v) => {
      this.plugin.settings.prayerEnabled = v;
      await this.plugin.saveSettings();
    }));
    e.createEl("p", { text: "Prayer Library remains the source of prayer records and daily selection.", cls: "personal-crm-muted" });
  }
  text(parent, name, desc, value, change, password = false) {
    new import_obsidian6.Setting(parent).setName(name).setDesc(desc).addText((t) => {
      t.setValue(value);
      t.inputEl.type = password ? "password" : "text";
      t.onChange(change);
    });
  }
};
var AddressBookPickerModal = class extends import_obsidian6.Modal {
  constructor(app, plugin, books) {
    super(app);
    this.plugin = plugin;
    this.books = books;
  }
  onOpen() {
    this.titleEl.setText("Choose iCloud address book");
    this.contentEl.createEl("p", { text: "Select the address book Personal CRM should manage. Discovery found multiple collections; none was selected automatically." });
    const list = this.contentEl.createDiv({ cls: "personal-crm-address-book-list" });
    for (const book of this.books) {
      const setting = new import_obsidian6.Setting(list).setName(book.label).setDesc(book.href);
      setting.addButton((button) => {
        button.setButtonText(book.href === this.plugin.settings.carddavAddressBookUrl ? "Selected" : "Use this book");
        if (book.href !== this.plugin.settings.carddavAddressBookUrl) button.setCta();
        button.onClick(async () => {
          this.plugin.settings.carddavAddressBookUrl = book.href;
          this.plugin.settings.carddavAddressBookLabel = book.label;
          this.plugin.settings.selectedAddressBookUrls = [book.href];
          await this.plugin.saveSettings();
          new import_obsidian6.Notice(`Selected ${book.label}.`);
          this.close();
        });
      });
    }
  }
  onClose() {
    this.contentEl.empty();
  }
};
var ContactGroupPickerModal = class extends import_obsidian6.Modal {
  constructor(app, plugin, groups) {
    super(app);
    this.plugin = plugin;
    this.groups = groups;
    this.selected = new Set(plugin.settings.selectedGroupNames);
  }
  onOpen() {
    this.titleEl.setText("Choose contact lists");
    this.contentEl.createEl("p", { text: "Choose zero or more groups. An empty selection syncs every contact in the selected address book." });
    for (const group of this.groups) new import_obsidian6.Setting(this.contentEl).setName(group.name).setDesc(`${group.memberUids.length} contacts`).addToggle((toggle) => toggle.setValue(this.selected.has(group.name)).onChange((value) => {
      if (value) this.selected.add(group.name);
      else this.selected.delete(group.name);
    }));
    new import_obsidian6.Setting(this.contentEl).addButton((button) => button.setButtonText("Save selection").setCta().onClick(async () => {
      this.plugin.settings.selectedGroupNames = [...this.selected];
      await this.plugin.saveSettings();
      new import_obsidian6.Notice(this.selected.size ? `Selected ${this.selected.size} contact list${this.selected.size === 1 ? "" : "s"}.` : "All contacts will be synced.");
      this.close();
    }));
  }
  onClose() {
    this.contentEl.empty();
  }
};

// src/types.ts
var DEFAULT_SETTINGS = { settingsVersion: 1, rootFolder: "Collections/Personal CRM", contactsFolder: "Collections/Personal CRM/Contacts", householdsFolder: "Collections/Personal CRM/Households", interactionsFolder: "Collections/Personal CRM/Interactions", reportsFolder: "Collections/Personal CRM/Reports", syncFolder: "Collections/Personal CRM/Sync", carddavUrl: "", carddavPrincipalUrl: "", carddavAddressBookUrl: "", carddavAddressBookLabel: "", selectedAddressBookUrls: [], selectedGroupNames: [], username: "", appPassword: "", refreshHours: 0, scheduleEnabled: false, prayerEnabled: true, prayerCategories: ["Friends", "Church", "Family"], dashboardPath: "Collections/Personal CRM/Personal CRM Index.md", showPrivacyReminder: true };

// styles.css
var styles_default = '.personal-crm-dashboard { --crm-accent: var(--interactive-accent); overflow-y: auto; padding: clamp(22px, 4vw, 52px); }\n.personal-crm-hero, .personal-crm-section { max-width: 1180px; margin: 0 auto 28px; }\n.personal-crm-hero { border: 1px solid var(--background-modifier-border); border-radius: 22px; padding: clamp(22px, 5vw, 48px); background: linear-gradient(135deg, var(--background-secondary), rgba(var(--interactive-accent-rgb), .12)); }\n.personal-crm-kicker { color: var(--crm-accent); font-size: var(--font-ui-small); font-weight: var(--font-semibold); letter-spacing: .14em; }\n.personal-crm-hero h1 { font-size: clamp(2rem, 5vw, 4rem); margin: .25rem 0; letter-spacing: -.04em; }\n.personal-crm-hero p { color: var(--text-muted); max-width: 680px; }\n.personal-crm-actions, .personal-crm-card-actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 18px; }\n.personal-crm-metrics { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; max-width: 1180px; margin: 0 auto 24px; }\n.personal-crm-metric { border: 1px solid var(--background-modifier-border); border-radius: 16px; padding: 18px; background: var(--background-secondary); }\n.personal-crm-metric strong, .personal-crm-metric span { display: block; } .personal-crm-metric strong { font-size: 1.8rem; }\n.personal-crm-metric span, .personal-crm-muted { color: var(--text-muted); }\n.personal-crm-section { border: 1px solid var(--background-modifier-border); border-radius: 18px; padding: clamp(22px, 3vw, 30px); background: var(--background-secondary); }\n.personal-crm-section h2 { margin: 0 0 18px; line-height: 1.2; }\n.personal-crm-section input[type="search"] { width: 100%; margin: 0 0 22px; }\n.personal-crm-contact-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 14px; }\n.personal-crm-contact-card { border: 1px solid var(--background-modifier-border); border-radius: 14px; padding: 18px; background: var(--background-primary); min-width: 0; }\n.personal-crm-contact-header { display: flex; align-items: center; gap: 8px; min-width: 0; margin-bottom: 14px; }\n.personal-crm-contact-header .personal-crm-card-link { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }\n.personal-crm-card-link { border: 0; padding: 0; background: transparent; color: var(--text-accent); font-size: 1.1rem; font-weight: var(--font-semibold); cursor: pointer; }\n.personal-crm-chip { flex: 0 0 auto; padding: 3px 8px; border-radius: 999px; font-size: var(--font-ui-smaller); background: var(--background-modifier-hover); }\n.personal-crm-chip.is-conflict { background: rgba(var(--color-red-rgb), .18); color: var(--color-red); }\n.personal-crm-modal .modal-content { padding-bottom: calc(28px + env(safe-area-inset-bottom)); }\n@media (max-width: 700px) { .personal-crm-dashboard { padding: 14px; } .personal-crm-metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); } .personal-crm-hero h1 { font-size: 2.2rem; } .personal-crm-contact-grid { grid-template-columns: 1fr; } .personal-crm-section { padding: 18px; margin-bottom: 20px; } }\n';

// src/main.ts
var PersonalCrmPlugin = class extends import_obsidian7.Plugin {
  constructor() {
    super(...arguments);
    this.settings = { ...DEFAULT_SETTINGS, selectedAddressBookUrls: [...DEFAULT_SETTINGS.selectedAddressBookUrls], selectedGroupNames: [...DEFAULT_SETTINGS.selectedGroupNames], prayerCategories: [...DEFAULT_SETTINGS.prayerCategories] };
    this.disposals = [];
  }
  async onload() {
    this.ensureStyles();
    await this.loadSettings();
    this.repository = new ContactRepository(this.app, this.settings);
    this.registerView(VIEW, (leaf) => new PersonalCrmView(leaf, this));
    this.addSettingTab(new PersonalCrmSettingsTab(this.app, this));
    this.addRibbonIcon("users", "Open Personal CRM", () => void this.openDashboard());
    this.addCommand({ id: "open-dashboard", name: "Open dashboard", callback: () => void this.openDashboard() });
    this.addCommand({ id: "new-contact", name: "New contact", callback: () => this.openNewContact() });
    this.addCommand({ id: "sync-preview", name: "Preview iCloud sync", callback: () => void this.syncPreview() });
    this.addCommand({ id: "sync-now", name: "Sync iCloud contacts (read-only)", callback: () => void this.syncNow() });
    this.addCommand({ id: "manage-address-books", name: "Discover iCloud address books", callback: () => void this.discoverAddressBooks() });
    this.addCommand({ id: "manage-contact-groups", name: "Choose iCloud contact lists", callback: () => void this.discoverContactGroups() });
    this.addCommand({ id: "review-conflicts", name: "Review CRM conflicts", callback: () => void this.reviewConflicts() });
    this.addCommand({ id: "open-prayer-people", name: "Open people to pray for", callback: () => this.openPrayerPeople() });
    this.addCommand({ id: "refresh", name: "Refresh CRM", callback: () => void this.refreshViews() });
    this.addCommand({ id: "open-settings", name: "Open Personal CRM settings", callback: () => this.openSettings() });
    this.registerDashboardIntegrations();
  }
  ensureStyles() {
    if (document.head.querySelector("style[data-red-beard-personal-crm]") || !styles_default) return;
    const style = document.createElement("style");
    style.dataset.redBeardPersonalCrm = "";
    style.textContent = styles_default;
    document.head.appendChild(style);
    this.register(() => style.remove());
  }
  onunload() {
    this.disposals.forEach((dispose) => dispose());
    this.app.workspace.detachLeavesOfType(VIEW);
  }
  async loadSettings() {
    var _a, _b;
    const saved = await this.loadData();
    this.settings = { ...DEFAULT_SETTINGS, ...saved != null ? saved : {}, selectedAddressBookUrls: (_a = saved == null ? void 0 : saved.selectedAddressBookUrls) != null ? _a : [], prayerCategories: (_b = saved == null ? void 0 : saved.prayerCategories) != null ? _b : DEFAULT_SETTINGS.prayerCategories };
  }
  async saveSettings() {
    var _a;
    await this.saveData(this.settings);
    (_a = this.repository) == null ? void 0 : _a.updateSettings(this.settings);
    await this.refreshViews();
  }
  async openDashboard() {
    await this.repository.initialize();
    let leaf = this.app.workspace.getLeavesOfType(VIEW)[0];
    if (!leaf) {
      leaf = this.app.workspace.getLeaf("tab");
      await leaf.setViewState({ type: VIEW, active: true });
    }
    await this.app.workspace.revealLeaf(leaf);
    await this.refreshViews();
  }
  openNewContact() {
    new NewContactModal(this.app, this).open();
  }
  openContact(contact) {
    new ContactDetailModal(this.app, this, contact).open();
  }
  async openFile(path) {
    const file = this.app.vault.getAbstractFileByPath(path);
    if (file instanceof import_obsidian7.TFile) await this.app.workspace.getLeaf(true).openFile(file);
    else new import_obsidian7.Notice(`Contact note not found: ${path}`);
  }
  async syncPreview() {
    if (!this.settings.carddavAddressBookUrl && !this.settings.carddavUrl) {
      new import_obsidian7.Notice("Configure an iCloud CardDAV URL in Personal CRM settings first.");
      return;
    }
    new import_obsidian7.Notice("Read-only sync preview is ready. Sync now will only import/update local mirrors; it never writes or deletes iCloud contacts.");
  }
  async syncNow() {
    try {
      const result = await this.repository.syncReadOnly();
      new import_obsidian7.Notice(`iCloud sync complete: ${result.imported} imported, ${result.updated} updated, ${result.conflicts} conflicts, ${result.missing} missing, ${result.failed} failed.`);
      await this.refreshViews();
    } catch (error) {
      new import_obsidian7.Notice(`iCloud sync failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  async discoverAddressBooks() {
    try {
      const books = await discoverAddressBooks(this.settings);
      if (!books.length) {
        new import_obsidian7.Notice("No iCloud address books were discovered.");
        return;
      }
      new AddressBookPickerModal(this.app, this, books).open();
    } catch (error) {
      new import_obsidian7.Notice(`Address-book discovery failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  async discoverContactGroups() {
    try {
      if (!this.settings.carddavAddressBookUrl) {
        new import_obsidian7.Notice("Choose an iCloud address book first.");
        return;
      }
      const groups = parseContactGroups(await fetchResources(this.settings));
      if (!groups.length) {
        new import_obsidian7.Notice("No contact lists/groups were found in this address book.");
        return;
      }
      new ContactGroupPickerModal(this.app, this, groups).open();
    } catch (error) {
      new import_obsidian7.Notice(`Contact-list discovery failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  async reviewConflicts() {
    const count = this.repository.getContacts().filter((contact) => contact.syncState === "conflict").length;
    new import_obsidian7.Notice(count ? `${count} CRM conflict${count === 1 ? "" : "s"} need review in the dashboard.` : "No CRM conflicts are currently recorded.");
  }
  openPrayerPeople() {
    var _a, _b, _c;
    const runtime = this.app;
    const command = (_a = runtime.commands) == null ? void 0 : _a.executeCommandById;
    if (command && ((_c = (_b = runtime.plugins) == null ? void 0 : _b.getPlugin) == null ? void 0 : _c.call(_b, "prayer-library"))) void command.call(runtime.commands, "prayer-library:open-dashboard");
    else new import_obsidian7.Notice("Prayer Library is not available. Enable it to use prayer integration.");
  }
  openSettings() {
    const setting = this.app.setting;
    if (setting) {
      setting.open();
      setting.openTabById(this.manifest.id);
    } else new import_obsidian7.Notice("Open Settings \u2192 Community plugins \u2192 Personal CRM.");
  }
  async refreshViews() {
    for (const leaf of this.app.workspace.getLeavesOfType(VIEW)) {
      const view = leaf.view;
      if (view instanceof PersonalCrmView) await view.render();
    }
  }
  registerDashboardIntegrations() {
    this.disposals.push(registerDashboardModule(this.app, { id: "personal-crm", name: "Personal CRM", command: "personal-crm:open-dashboard", icon: "users", description: "People, relationships, follow-ups, and prayer connections.", order: 25 }));
    this.disposals.push(registerDashboardWidget(this.app, { id: "personal-crm/overview", name: "Personal CRM", description: "Contacts, follow-ups, and iCloud sync status.", icon: "users", defaultLayout: { w: 4, mobileW: 12, h: 3, order: 45 }, mobile: "responsive", render: (_ctx, container) => {
      container.empty();
      const contacts = this.repository.getContacts();
      const active = contacts.filter((c) => c.recordState === "active");
      container.createEl("strong", { text: `${active.length} active contacts` });
      container.createEl("p", { text: `${contacts.filter((c) => c.syncState === "conflict").length} conflicts \xB7 ${contacts.filter((c) => c.prayerEnabled).length} prayer-enabled` });
      const button = container.createEl("button", { text: "Open Personal CRM" });
      button.onclick = () => void this.openDashboard();
    } }));
  }
};
