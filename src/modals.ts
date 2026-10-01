import { App, Modal, Notice, Setting, TFile } from "obsidian";
import type PersonalCrmPlugin from "./main";
import type { ContactRecord } from "./types";

export class NewContactModal extends Modal {
  private name = "";
  constructor(app: App, private plugin: PersonalCrmPlugin) { super(app); }
  onOpen(): void { this.modalEl.addClass("personal-crm-modal"); this.contentEl.empty(); this.setTitle("New contact"); new Setting(this.contentEl).setName("Name").addText(t => t.onChange(v => this.name = v)); new Setting(this.contentEl).setName("Privacy").setDesc("This creates an Obsidian workspace note only. It never creates or removes an iCloud contact."); new Setting(this.contentEl).addButton(b => b.setButtonText("Save").setCta().onClick(async () => { if (!this.name.trim()) { new Notice("Name is required."); return; } await this.plugin.repository.createLocalContact(this.name); new Notice("Local CRM workspace created."); this.close(); await this.plugin.refreshViews(); })).addButton(b => b.setButtonText("Cancel").onClick(() => this.close())); }
}

export class ContactDetailModal extends Modal {
  constructor(app: App, private plugin: PersonalCrmPlugin, private contact: ContactRecord) { super(app); }
  onOpen(): void { this.modalEl.addClass("personal-crm-modal"); this.contentEl.empty(); this.setTitle(this.contact.displayName); this.contentEl.createEl("p", { text: `${this.contact.syncState} · ${this.contact.recordState}` }); this.contentEl.createEl("p", { text: this.contact.emails.join(", ") || "No email" }); this.contentEl.createEl("p", { text: this.contact.phones.join(", ") || "No phone" }); this.contentEl.createEl("p", { text: this.contact.notes || "No iCloud Notes content" }); new Setting(this.contentEl).addButton(b => b.setButtonText("Open note").onClick(() => { const file = this.plugin.app.vault.getAbstractFileByPath(this.contact.path); if (file instanceof TFile) void this.plugin.app.workspace.getLeaf(true).openFile(file); this.close(); })).addButton(b => b.setButtonText("Close").onClick(() => this.close())); }
}
