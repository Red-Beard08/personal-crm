import { Modal, Notice, PluginSettingTab, Setting } from "obsidian";
import type { AddressBook } from "./types";
import type PersonalCrmPlugin from "./main";

export class PersonalCrmSettingsTab extends PluginSettingTab {
  constructor(app: import("obsidian").App, private plugin: PersonalCrmPlugin) { super(app, plugin); }
  display(): void {
    const e = this.containerEl; e.empty(); e.createEl("h2", { text: "Personal CRM" });
    e.createEl("h3", { text: "Storage" });
    this.text(e, "Root folder", "All CRM notes stay below this folder.", this.plugin.settings.rootFolder, async v => { this.plugin.settings.rootFolder = v; await this.plugin.saveSettings(); });
    this.text(e, "Contacts folder", "Mirror notes are stored here.", this.plugin.settings.contactsFolder, async v => { this.plugin.settings.contactsFolder = v; await this.plugin.saveSettings(); });
    e.createEl("h3", { text: "CardDAV / iCloud" });
    this.text(e, "Discovery URL", "Use the iCloud CardDAV host; the address book is resolved during discovery.", this.plugin.settings.carddavUrl, async v => { this.plugin.settings.carddavUrl = v; await this.plugin.saveSettings(); });
    new Setting(e).setName("Discover address books").setDesc(this.plugin.settings.carddavAddressBookLabel ? `Selected: ${this.plugin.settings.carddavAddressBookLabel}` : "Resolve your iCloud principal and choose an address book before syncing.").addButton(b => b.setButtonText("Discover").setCta().onClick(() => void this.plugin.discoverAddressBooks()));
    this.text(e, "Address book URL", "Selected collection URL. Leave blank until discovery completes.", this.plugin.settings.carddavAddressBookUrl, async v => { this.plugin.settings.carddavAddressBookUrl = v; await this.plugin.saveSettings(); });
    this.text(e, "Username", "iCloud/CardDAV username.", this.plugin.settings.username, async v => { this.plugin.settings.username = v; await this.plugin.saveSettings(); });
    this.text(e, "App-specific password", "Stored in plugin data and never written to Markdown.", this.plugin.settings.appPassword, async v => { this.plugin.settings.appPassword = v; await this.plugin.saveSettings(); }, true);
    new Setting(e).setName("Scheduled refresh").setDesc("Read-only CardDAV refresh; disabled by default.").addToggle(t => t.setValue(this.plugin.settings.scheduleEnabled).onChange(async v => { this.plugin.settings.scheduleEnabled = v; await this.plugin.saveSettings(); }));
    new Setting(e).setName("Refresh interval (hours)").addText(t => t.setValue(String(this.plugin.settings.refreshHours)).onChange(async v => { this.plugin.settings.refreshHours = Math.max(0, Number(v) || 0); await this.plugin.saveSettings(); }));
    e.createEl("h3", { text: "Prayer integration" });
    new Setting(e).setName("Enable prayer links").addToggle(t => t.setValue(this.plugin.settings.prayerEnabled).onChange(async v => { this.plugin.settings.prayerEnabled = v; await this.plugin.saveSettings(); }));
    e.createEl("p", { text: "Prayer Library remains the source of prayer records and daily selection.", cls: "personal-crm-muted" });
  }
  private text(parent: HTMLElement, name: string, desc: string, value: string, change: (value: string) => Promise<void>, password = false): void { new Setting(parent).setName(name).setDesc(desc).addText(t => { t.setValue(value); t.inputEl.type = password ? "password" : "text"; t.onChange(change); }); }
}

export class AddressBookPickerModal extends Modal {
  constructor(app: import("obsidian").App, private plugin: PersonalCrmPlugin, private books: AddressBook[]) { super(app); }
  onOpen(): void {
    this.titleEl.setText("Choose iCloud address book");
    this.contentEl.createEl("p", { text: "Select the address book Personal CRM should manage. Discovery found multiple collections; none was selected automatically." });
    const list = this.contentEl.createDiv({ cls: "personal-crm-address-book-list" });
    for (const book of this.books) {
      const setting = new Setting(list).setName(book.label).setDesc(book.href);
      setting.addButton(button => {
        button.setButtonText(book.href === this.plugin.settings.carddavAddressBookUrl ? "Selected" : "Use this book");
        if (book.href !== this.plugin.settings.carddavAddressBookUrl) button.setCta();
        button.onClick(async () => {
        this.plugin.settings.carddavAddressBookUrl = book.href;
        this.plugin.settings.carddavAddressBookLabel = book.label;
        this.plugin.settings.selectedAddressBookUrls = [book.href];
        await this.plugin.saveSettings();
        new Notice(`Selected ${book.label}.`);
        this.close();
        });
      });
    }
  }
  onClose(): void { this.contentEl.empty(); }
}
