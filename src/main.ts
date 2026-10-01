import { Notice, Plugin, TFile } from "obsidian";
import { discoverAddressBooks } from "./carddav";
import { PersonalCrmView, VIEW } from "./dashboard";
import { registerDashboardModule, registerDashboardWidget } from "./dashboard-bridge";
import { ContactDetailModal, NewContactModal } from "./modals";
import { ContactRepository } from "./repository";
import { PersonalCrmSettingsTab } from "./settings";
import { DEFAULT_SETTINGS, type ContactSettings, type ContactRecord } from "./types";
import crmCss from "../styles.css";

export default class PersonalCrmPlugin extends Plugin {
  settings: ContactSettings = { ...DEFAULT_SETTINGS, selectedAddressBookUrls: [...DEFAULT_SETTINGS.selectedAddressBookUrls], prayerCategories: [...DEFAULT_SETTINGS.prayerCategories] };
  repository!: ContactRepository;
  private disposals: Array<() => void> = [];
  async onload(): Promise<void> {
    this.ensureStyles(); await this.loadSettings(); this.repository = new ContactRepository(this.app, this.settings); this.registerView(VIEW, leaf => new PersonalCrmView(leaf, this)); this.addSettingTab(new PersonalCrmSettingsTab(this.app, this));
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
  private ensureStyles(): void { if (document.head.querySelector("style[data-red-beard-personal-crm]") || !crmCss) return; const style = document.createElement("style"); style.dataset.redBeardPersonalCrm = ""; style.textContent = crmCss; document.head.appendChild(style); this.register(() => style.remove()); }
  onunload(): void { this.disposals.forEach(dispose => dispose()); this.app.workspace.detachLeavesOfType(VIEW); }
  async loadSettings(): Promise<void> { const saved = await this.loadData() as Partial<ContactSettings> | null; this.settings = { ...DEFAULT_SETTINGS, ...(saved ?? {}), selectedAddressBookUrls: saved?.selectedAddressBookUrls ?? [], prayerCategories: saved?.prayerCategories ?? DEFAULT_SETTINGS.prayerCategories }; }
  async saveSettings(): Promise<void> { await this.saveData(this.settings); this.repository?.updateSettings(this.settings); await this.refreshViews(); }
  async openDashboard(): Promise<void> { await this.repository.initialize(); let leaf = this.app.workspace.getLeavesOfType(VIEW)[0]; if (!leaf) { leaf = this.app.workspace.getLeaf("tab"); await leaf.setViewState({ type: VIEW, active: true }); } await this.app.workspace.revealLeaf(leaf); await this.refreshViews(); }
  openNewContact(): void { new NewContactModal(this.app, this).open(); }
  openContact(contact: ContactRecord): void { new ContactDetailModal(this.app, this, contact).open(); }
  async openFile(path: string): Promise<void> { const file = this.app.vault.getAbstractFileByPath(path); if (file instanceof TFile) await this.app.workspace.getLeaf(true).openFile(file); else new Notice(`Contact note not found: ${path}`); }
  async syncPreview(): Promise<void> { if (!this.settings.carddavAddressBookUrl && !this.settings.carddavUrl) { new Notice("Configure an iCloud CardDAV URL in Personal CRM settings first."); return; } new Notice("Read-only sync preview is ready. Sync now will only import/update local mirrors; it never writes or deletes iCloud contacts."); }
  async syncNow(): Promise<void> { try { const result = await this.repository.syncReadOnly(); new Notice(`iCloud sync complete: ${result.imported} imported, ${result.updated} updated, ${result.conflicts} conflicts, ${result.missing} missing, ${result.failed} failed.`); await this.refreshViews(); } catch (error) { new Notice(`iCloud sync failed: ${error instanceof Error ? error.message : String(error)}`); } }
  private async discoverAddressBooks(): Promise<void> { try { const books = await discoverAddressBooks(this.settings); if (!books.length) { new Notice("No iCloud address books were discovered."); return; } this.settings.carddavAddressBookUrl = books[0].href; this.settings.carddavAddressBookLabel = books[0].label; await this.saveSettings(); new Notice(`Discovered ${books.length} address book${books.length === 1 ? "" : "s"}; selected ${books[0].label}.`); } catch (error) { new Notice(`Address-book discovery failed: ${error instanceof Error ? error.message : String(error)}`); } }
  private async reviewConflicts(): Promise<void> { const count = this.repository.getContacts().filter(contact => contact.syncState === "conflict").length; new Notice(count ? `${count} CRM conflict${count === 1 ? "" : "s"} need review in the dashboard.` : "No CRM conflicts are currently recorded."); }
  openPrayerPeople(): void { const runtime = this.app as typeof this.app & { commands?: { executeCommandById?: (id: string) => boolean }; plugins?: { getPlugin?: (id: string) => unknown } }; const command = runtime.commands?.executeCommandById; if (command && runtime.plugins?.getPlugin?.("prayer-library")) void command.call(runtime.commands, "prayer-library:open-dashboard"); else new Notice("Prayer Library is not available. Enable it to use prayer integration."); }
  openSettings(): void { const setting = (this.app as typeof this.app & { setting?: { open(): void; openTabById(id: string): void } }).setting; if (setting) { setting.open(); setting.openTabById(this.manifest.id); } else new Notice("Open Settings → Community plugins → Personal CRM."); }
  async refreshViews(): Promise<void> { for (const leaf of this.app.workspace.getLeavesOfType(VIEW)) { const view = leaf.view; if (view instanceof PersonalCrmView) await view.render(); } }
  private registerDashboardIntegrations(): void { this.disposals.push(registerDashboardModule(this.app, { id: "personal-crm", name: "Personal CRM", command: "personal-crm:open-dashboard", icon: "users", description: "People, relationships, follow-ups, and prayer connections.", order: 25 })); this.disposals.push(registerDashboardWidget(this.app, { id: "personal-crm/overview", name: "Personal CRM", description: "Contacts, follow-ups, and iCloud sync status.", icon: "users", defaultLayout: { w: 4, mobileW: 12, h: 3, order: 45 }, mobile: "responsive", render: (_ctx, container) => { container.empty(); const contacts = this.repository.getContacts(); const active = contacts.filter(c => c.recordState === "active"); container.createEl("strong", { text: `${active.length} active contacts` }); container.createEl("p", { text: `${contacts.filter(c => c.syncState === "conflict").length} conflicts · ${contacts.filter(c => c.prayerEnabled).length} prayer-enabled` }); const button = container.createEl("button", { text: "Open Personal CRM" }); button.onclick = () => void this.openDashboard(); } })); }
}
