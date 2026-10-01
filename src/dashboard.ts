import { ButtonComponent, ItemView, WorkspaceLeaf } from "obsidian";
import type PersonalCrmPlugin from "./main";

export const VIEW = "personal-crm-dashboard";

export class PersonalCrmView extends ItemView {
  constructor(leaf: WorkspaceLeaf, private plugin: PersonalCrmPlugin) { super(leaf); }
  getViewType(): string { return VIEW; }
  getDisplayText(): string { return "Personal CRM"; }
  getIcon(): string { return "users"; }
  async onOpen(): Promise<void> { await this.render(); }

  async render(): Promise<void> {
    const el = this.contentEl;
    el.empty();
    el.addClass("personal-crm-dashboard");
    const contacts = this.plugin.repository.getContacts();
    const active = contacts.filter(c => c.recordState === "active");
    const conflicts = contacts.filter(c => c.syncState === "conflict");
    const due = contacts.filter(c => c.nextContactAt && c.nextContactAt <= new Date().toISOString());
    const hero = el.createDiv("personal-crm-hero");
    hero.createEl("span", { text: "RED-BEARD · PERSONAL CRM", cls: "personal-crm-kicker" });
    hero.createEl("h1", { text: "People worth remembering." });
    hero.createEl("p", { text: "iCloud remains authoritative. Obsidian keeps the relationship context readable, reviewable, and connected." });
    const actions = hero.createDiv("personal-crm-actions");
    new ButtonComponent(actions).setButtonText("New Contact").setCta().onClick(() => this.plugin.openNewContact());
    new ButtonComponent(actions).setButtonText("Sync preview").onClick(() => void this.plugin.syncPreview());
    new ButtonComponent(actions).setButtonText("Sync now").onClick(() => void this.plugin.syncNow());
    new ButtonComponent(actions).setButtonText("Settings").onClick(() => this.plugin.openSettings());
    const metrics = el.createDiv("personal-crm-metrics");
    [[active.length, "Active contacts"], [contacts.length - active.length, "Inactive"], [due.length, "Follow-ups due"], [conflicts.length, "Conflicts"]].forEach(([value, label]) => {
      const card = metrics.createDiv("personal-crm-metric");
      card.createEl("strong", { text: String(value) });
      card.createEl("span", { text: String(label) });
    });
    const section = el.createDiv("personal-crm-section");
    section.createEl("h2", { text: "People" });
    const toolbar = section.createDiv("personal-crm-table-toolbar");
    const search = toolbar.createEl("input", { type: "search", placeholder: "Search all people…" });
    const tableWrap = section.createDiv("personal-crm-table-wrap");
    const table = tableWrap.createEl("table", { cls: "personal-crm-contact-table" });
    const columns = [{ key: "displayName", label: "Name" }, { key: "relationshipType", label: "Relationship" }, { key: "church", label: "Church" }, { key: "status", label: "Status" }, { key: "cadenceDays", label: "Cadence" }, { key: "syncState", label: "Sync" }] as const;
    const filters: Record<string, string> = {};
    let sortKey: typeof columns[number]["key"] = "displayName"; let descending = false;
    const head = table.createTHead(); const headerRow = head.insertRow(); const filterRow = head.insertRow();
    const valueFor = (contact: typeof contacts[number], key: typeof columns[number]["key"]): string => key === "cadenceDays" ? (contact.cadenceDays ? `${contact.cadenceDays} days` : "") : String(contact[key] ?? "");
    columns.forEach(column => { const cell = headerRow.insertCell(); const sort = cell.createEl("button", { text: column.label, cls: "personal-crm-sort-button" }); sort.onclick = () => { if (sortKey === column.key) descending = !descending; else { sortKey = column.key; descending = false; } draw(); }; const filterCell = filterRow.insertCell(); const input = filterCell.createEl("input", { type: "search", placeholder: `Filter ${column.label.toLowerCase()}…` }); input.oninput = () => { filters[column.key] = input.value.toLowerCase(); draw(); }; });
    headerRow.insertCell().setText("Actions"); filterRow.insertCell();
    const body = table.createTBody();
    const draw = () => { body.empty(); const query = search.value.toLowerCase(); const visible = contacts.filter(contact => { const all = `${contact.displayName} ${contact.organization} ${contact.relationshipType} ${contact.church} ${contact.tags.join(" ")}`.toLowerCase(); return (!query || all.includes(query)) && columns.every(column => !filters[column.key] || valueFor(contact, column.key).toLowerCase().includes(filters[column.key])); }).sort((a, b) => { const left = valueFor(a, sortKey).toLowerCase(); const right = valueFor(b, sortKey).toLowerCase(); return (left.localeCompare(right, undefined, { numeric: true }) || a.displayName.localeCompare(b.displayName)) * (descending ? -1 : 1); }); visible.forEach(contact => { const row = body.insertRow(); const nameCell = row.insertCell(); const link = nameCell.createEl("button", { text: contact.displayName, cls: "personal-crm-table-link" }); link.onclick = () => this.plugin.openContact(contact); row.insertCell().setText(contact.relationshipType || "—"); row.insertCell().setText(contact.church || contact.organization || "—"); row.insertCell().setText(contact.status || "—"); row.insertCell().setText(contact.cadenceDays ? `${contact.cadenceDays} days` : "—"); const syncCell = row.insertCell(); syncCell.createEl("span", { text: contact.syncState, cls: `personal-crm-chip is-${contact.syncState}` }); const actions = row.insertCell(); new ButtonComponent(actions).setButtonText("Open").onClick(() => this.plugin.openFile(contact.path)); }); if (!visible.length) { const row = body.insertRow(); const cell = row.insertCell(); cell.colSpan = columns.length + 1; cell.setText("No CRM contacts match these filters."); } };
    search.oninput = draw;
    draw();
  }
}
