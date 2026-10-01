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
    if (this.plugin.settings.showPrivacyReminder) el.createEl("p", { text: "Privacy reminder: contact mirrors are ordinary Markdown. iCloud remains the source of truth for identity fields.", cls: "personal-crm-notice" });
    const section = el.createDiv("personal-crm-section");
    section.createEl("h2", { text: "People" });
    const search = section.createEl("input", { type: "search", placeholder: "Search contacts…" });
    const grid = section.createDiv("personal-crm-contact-grid");
    const draw = () => {
      grid.empty();
      const query = search.value.toLowerCase();
      contacts.filter(c => !query || `${c.displayName} ${c.organization} ${c.relationshipType} ${c.tags.join(" ")}`.toLowerCase().includes(query)).forEach(contact => {
        const card = grid.createDiv("personal-crm-contact-card");
        const title = card.createEl("button", { text: contact.displayName, cls: "personal-crm-card-link" });
        title.onclick = () => this.plugin.openContact(contact);
        card.createEl("span", { text: contact.syncState, cls: `personal-crm-chip is-${contact.syncState}` });
        card.createEl("p", { text: [contact.organization, contact.relationshipType].filter(Boolean).join(" · ") || "No relationship details yet" });
        const row = card.createDiv("personal-crm-card-actions");
        new ButtonComponent(row).setButtonText("Open note").onClick(() => this.plugin.openFile(contact.path));
        if (contact.prayerEnabled) new ButtonComponent(row).setButtonText("Prayer enabled").onClick(() => void this.plugin.openPrayerPeople());
      });
      if (!grid.children.length) grid.createEl("p", { text: "No CRM contacts yet. Import from iCloud or create a local workspace note." });
    };
    search.oninput = draw;
    draw();
  }
}
