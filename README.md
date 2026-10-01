# Personal CRM

Personal CRM is a mobile-compatible Red‑Beard Obsidian add-on for relationship notes, follow-ups, prayer connections, and safe iCloud Contacts mirroring.

## Source of truth

iCloud Contacts remains authoritative for contact identity. Version 1 uses CardDAV read-only discovery/import. It never sends `PUT`, `DELETE`, or membership-removal requests to iCloud. Obsidian Markdown mirrors are a workspace and history layer, not a replacement for iCloud Contacts.

The iCloud Notes field is designed for a bounded `red-beard:personal-crm` block. Future explicit push support will preserve all text outside that block and require ETag-aware review.

## Build

```text
npm ci
npm test
```

Copy `manifest.json`, `main.js`, and `styles.css` into `.obsidian/plugins/personal-crm/`.

## Default vault storage

```text
Collections/Personal CRM/
  Contacts/
  Households/
  Interactions/
  Reports/
  Sync/
```

No credentials, personal contacts, or vault-specific Markdown belong in this repository.
