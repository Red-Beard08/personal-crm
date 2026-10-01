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
function parseVCard(input) {
  var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n, _o, _p, _q, _r, _s;
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
  return { uid: (_g = (_f = fields.get("UID")) == null ? void 0 : _f[0]) != null ? _g : "", displayName, givenName: (_h = name[1]) != null ? _h : "", familyName: (_i = name[0]) != null ? _i : "", emails: (_j = fields.get("EMAIL")) != null ? _j : [], phones: [...(_k = fields.get("TEL")) != null ? _k : []], organization: (_m = (_l = fields.get("ORG")) == null ? void 0 : _l[0]) != null ? _m : "", addresses: (_n = fields.get("ADR")) != null ? _n : [], websites: (_o = fields.get("URL")) != null ? _o : [], birthday: (_q = (_p = fields.get("BDAY")) == null ? void 0 : _p[0]) != null ? _q : "", notes: (_s = (_r = fields.get("NOTE")) == null ? void 0 : _r.join("\n")) != null ? _s : "" };
}
function parseAddressBooks(xml, baseUrl) {
  var _a, _b, _c, _d, _e, _f;
  const result = [];
  const response = (_a = xml.match(/<[^>]*response[\s\S]*?<\/[^>]*response>/gi)) != null ? _a : [];
  for (const chunk of response) {
    const href = (_c = (_b = chunk.match(/<[^>]*href[^>]*>([\s\S]*?)<\//i)) == null ? void 0 : _b[1]) == null ? void 0 : _c.trim();
    if (!href) continue;
    const label = (_f = (_e = (_d = chunk.match(/<[^>]*(?:displayname|addressbook-description)[^>]*>([\s\S]*?)<\//i)) == null ? void 0 : _d[1]) == null ? void 0 : _e.replace(/<[^>]+>/g, "").trim()) != null ? _f : href;
    result.push({ href: new URL(href, baseUrl).toString(), label });
  }
  return [...new Map(result.map((item) => [item.href, item])).values()];
}
async function discoverAddressBooks(settings) {
  if (!settings.carddavUrl.trim()) throw new Error("Enter the iCloud CardDAV discovery URL first.");
  const response = await (0, import_obsidian.requestUrl)({ url: settings.carddavUrl, method: "REPORT", headers: authHeaders(settings), body: '<?xml version="1.0"?><d:propfind xmlns:d="DAV:" xmlns:card="urn:ietf:params:xml:ns:carddav"><d:prop><d:displayname/><d:resourcetype/></d:prop></d:propfind>' });
  return parseAddressBooks(response.text, settings.carddavUrl);
}
async function fetchResources(settings) {
  var _a, _b, _c, _d, _e, _f, _g;
  const url = settings.carddavAddressBookUrl || settings.carddavUrl;
  if (!url.trim()) throw new Error("Select an iCloud address book before syncing.");
  const response = await (0, import_obsidian.requestUrl)({ url, method: "REPORT", headers: { ...authHeaders(settings), Accept: "application/xml, text/xml, text/vcard" }, body: '<?xml version="1.0"?><c:addressbook-query xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:carddav"><d:prop><d:getetag/><d:getcontenttype/><c:address-data/></d:prop></c:addressbook-query>' });
  const resources = [];
  const chunks = (_a = response.text.match(/<[^>]*response[\s\S]*?<\/[^>]*response>/gi)) != null ? _a : [];
  for (const chunk of chunks) {
    const href = (_c = (_b = chunk.match(/<[^>]*href[^>]*>([\s\S]*?)<\//i)) == null ? void 0 : _b[1]) == null ? void 0 : _c.trim();
    const etag = (_f = (_e = (_d = chunk.match(/<[^>]*getetag[^>]*>([\s\S]*?)<\//i)) == null ? void 0 : _d[1]) == null ? void 0 : _e.trim()) != null ? _f : "";
    const data = (_g = chunk.match(/<[^>]*address-data[^>]*>([\s\S]*?)<\//i)) == null ? void 0 : _g[1];
    if (href && data) resources.push({ href: new URL(href, url).toString(), etag, vcardText: data.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&") });
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
    const metrics = el.createDiv("personal-crm-metrics");
    [[active.length, "Active contacts"], [contacts.length - active.length, "Inactive"], [due.length, "Follow-ups due"], [conflicts.length, "Conflicts"]].forEach(([value, label]) => {
      const card = metrics.createDiv("personal-crm-metric");
      card.createEl("strong", { text: String(value) });
      card.createEl("span", { text: String(label) });
    });
    if (this.plugin.settings.showPrivacyReminder) el.createEl("p", { text: "Privacy reminder: contact mirrors are ordinary Markdown. iCloud remains the source of truth for identity fields.", cls: "personal-crm-notice" });
    const section = el.createDiv("personal-crm-section");
    section.createEl("h2", { text: "People" });
    const search = section.createEl("input", { type: "search", placeholder: "Search contacts\u2026" });
    const grid = section.createDiv("personal-crm-contact-grid");
    const draw = () => {
      grid.empty();
      const query = search.value.toLowerCase();
      contacts.filter((c) => !query || `${c.displayName} ${c.organization} ${c.relationshipType} ${c.tags.join(" ")}`.toLowerCase().includes(query)).forEach((contact) => {
        const card = grid.createDiv("personal-crm-contact-card");
        const title = card.createEl("button", { text: contact.displayName, cls: "personal-crm-card-link" });
        title.onclick = () => this.plugin.openContact(contact);
        card.createEl("span", { text: contact.syncState, cls: `personal-crm-chip is-${contact.syncState}` });
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
  var _a, _b;
  return (_b = (_a = app.plugins) == null ? void 0 : _a.getPlugin) == null ? void 0 : _b.call(_a, "red-beard-dashboard");
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
    const existing = this.getContacts();
    const byUid = new Map(existing.filter((c) => c.icloudUid).map((c) => [c.icloudUid, c]));
    let imported = 0, updated = 0, conflicts = 0, failed = 0;
    const seen = /* @__PURE__ */ new Set();
    for (const resource of resources) {
      try {
        const card = parseVCard(resource.vcardText);
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
    this.text(e, "Discovery URL", "CardDAV discovery or address-book REPORT URL.", this.plugin.settings.carddavUrl, async (v) => {
      this.plugin.settings.carddavUrl = v;
      await this.plugin.saveSettings();
    });
    this.text(e, "Address book URL", "Selected address book collection URL.", this.plugin.settings.carddavAddressBookUrl, async (v) => {
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

// src/types.ts
var DEFAULT_SETTINGS = { settingsVersion: 1, rootFolder: "Collections/Personal CRM", contactsFolder: "Collections/Personal CRM/Contacts", householdsFolder: "Collections/Personal CRM/Households", interactionsFolder: "Collections/Personal CRM/Interactions", reportsFolder: "Collections/Personal CRM/Reports", syncFolder: "Collections/Personal CRM/Sync", carddavUrl: "", carddavPrincipalUrl: "", carddavAddressBookUrl: "", carddavAddressBookLabel: "", selectedAddressBookUrls: [], username: "", appPassword: "", refreshHours: 0, scheduleEnabled: false, prayerEnabled: true, prayerCategories: ["Friends", "Church", "Family"], dashboardPath: "Collections/Personal CRM/Personal CRM Index.md", showPrivacyReminder: true };

// src/main.ts
var PersonalCrmPlugin = class extends import_obsidian7.Plugin {
  constructor() {
    super(...arguments);
    this.settings = { ...DEFAULT_SETTINGS, selectedAddressBookUrls: [...DEFAULT_SETTINGS.selectedAddressBookUrls], prayerCategories: [...DEFAULT_SETTINGS.prayerCategories] };
    this.disposals = [];
  }
  async onload() {
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
    this.addCommand({ id: "review-conflicts", name: "Review CRM conflicts", callback: () => void this.reviewConflicts() });
    this.addCommand({ id: "open-prayer-people", name: "Open people to pray for", callback: () => this.openPrayerPeople() });
    this.addCommand({ id: "refresh", name: "Refresh CRM", callback: () => void this.refreshViews() });
    this.addCommand({ id: "open-settings", name: "Open Personal CRM settings", callback: () => this.openSettings() });
    this.registerDashboardIntegrations();
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
      this.settings.carddavAddressBookUrl = books[0].href;
      this.settings.carddavAddressBookLabel = books[0].label;
      await this.saveSettings();
      new import_obsidian7.Notice(`Discovered ${books.length} address book${books.length === 1 ? "" : "s"}; selected ${books[0].label}.`);
    } catch (error) {
      new import_obsidian7.Notice(`Address-book discovery failed: ${error instanceof Error ? error.message : String(error)}`);
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
