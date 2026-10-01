import { requestUrl } from "obsidian";
import type { AddressBook, CardDavResource, ContactSettings } from "./types";

export interface ParsedVCard { uid: string; displayName: string; givenName: string; familyName: string; emails: string[]; phones: string[]; organization: string; addresses: string[]; websites: string[]; birthday: string; notes: string; }
function xmlDecode(value: string): string { return value.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&").trim(); }
function unescape(value: string): string { return value.replace(/\\n/gi, "\n").replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\\\/g, "\\").trim(); }
function unfold(input: string): string[] { const lines = input.replace(/\r/g, "").split("\n"); const out: string[] = []; for (const line of lines) { if (/^[ \t]/.test(line) && out.length) out[out.length - 1] += line.slice(1); else out.push(line); } return out; }
function firstTag(input: string, localName: string): string { const escaped = localName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); const match = input.match(new RegExp(`<[^>]*:?${escaped}[^>]*>([\\s\\S]*?)<\\/[^>]*:?${escaped}\\s*>`, "i")); return match?.[1] ? xmlDecode(match[1]) : ""; }
function responseChunks(xml: string): string[] { return xml.match(/<[^>]*:?response(?:\s[^>]*)?>[\s\S]*?<\/[^>]*:?response\s*>/gi) ?? []; }
function absoluteHref(href: string, baseUrl: string): string { try { return new URL(href, baseUrl).toString(); } catch { return href; } }

export function parseVCard(input: string): ParsedVCard {
  const fields = new Map<string, string[]>();
  for (const line of unfold(input)) { const colon = line.indexOf(":"); if (colon < 0) continue; const key = line.slice(0, colon).split(";")[0].toUpperCase(); const value = unescape(line.slice(colon + 1)); fields.set(key, [...(fields.get(key) ?? []), value]); }
  const name = (fields.get("N")?.[0] ?? "").split(";"); const displayName = fields.get("FN")?.[0] ?? ([name[1], name[0]].filter(Boolean).join(" ") || "Unnamed contact");
  return { uid: fields.get("UID")?.[0] ?? "", displayName, givenName: name[1] ?? "", familyName: name[0] ?? "", emails: fields.get("EMAIL") ?? [], phones: [...(fields.get("TEL") ?? [])], organization: fields.get("ORG")?.[0] ?? "", addresses: fields.get("ADR") ?? [], websites: fields.get("URL") ?? [], birthday: fields.get("BDAY")?.[0] ?? "", notes: fields.get("NOTE")?.join("\n") ?? "" };
}
export function parseAddressBooks(xml: string, baseUrl: string): AddressBook[] {
  const result: AddressBook[] = [];
  for (const chunk of responseChunks(xml)) { const href = firstTag(chunk, "href"); if (!href) continue; const resourceType = firstTag(chunk, "resourcetype").toLowerCase(); if (resourceType && !resourceType.includes("addressbook")) continue; const label = firstTag(chunk, "displayname") || firstTag(chunk, "addressbook-description") || href; result.push({ href: absoluteHref(href, baseUrl), label }); }
  return [...new Map(result.map(item => [item.href, item])).values()];
}
async function propfind(url: string, settings: ContactSettings, body: string, depth: "0" | "1"): Promise<string> { const response = await requestUrl({ url, method: "PROPFIND", headers: { ...authHeaders(settings), Depth: depth, "Content-Type": "application/xml; charset=utf-8", Accept: "application/xml, text/xml" }, body }); return response.text; }
const PRINCIPAL_PROPFIND = `<?xml version="1.0" encoding="UTF-8"?><d:propfind xmlns:d="DAV:" xmlns:cs="http://calendarserver.org/ns/" xmlns:card="urn:ietf:params:xml:ns:carddav"><d:prop><d:current-user-principal/><cs:addressbook-home-set/><d:resourcetype/><d:displayname/></d:prop></d:propfind>`;
const HOME_PROPFIND = `<?xml version="1.0" encoding="UTF-8"?><d:propfind xmlns:d="DAV:" xmlns:card="urn:ietf:params:xml:ns:carddav"><d:prop><d:displayname/><d:resourcetype/></d:prop></d:propfind>`;
export async function discoverAddressBooks(settings: ContactSettings): Promise<AddressBook[]> {
  const base = settings.carddavUrl.trim(); if (!base) throw new Error("Enter the iCloud CardDAV discovery URL first."); const root = new URL(base).toString();
  const rootXml = await propfind(root, settings, PRINCIPAL_PROPFIND, "0"); const rootChunk = responseChunks(rootXml)[0] ?? rootXml; const principal = firstTag(firstTag(rootChunk, "current-user-principal"), "href"); const principalUrl = absoluteHref(principal || settings.carddavPrincipalUrl, root); if (!principalUrl) throw new Error("iCloud did not return a CardDAV principal URL.");
  const principalXml = await propfind(principalUrl, settings, PRINCIPAL_PROPFIND, "0"); const principalChunk = responseChunks(principalXml)[0] ?? principalXml; const home = firstTag(firstTag(principalChunk, "addressbook-home-set"), "href"); const homeUrl = absoluteHref(home, principalUrl); if (!homeUrl) throw new Error("iCloud did not return an address-book home-set URL.");
  const homeXml = await propfind(homeUrl, settings, HOME_PROPFIND, "1"); const books = parseAddressBooks(homeXml, homeUrl); if (!books.length) throw new Error("No iCloud address books were found under the CardDAV home-set."); return books;
}
export async function fetchResources(settings: ContactSettings): Promise<CardDavResource[]> {
  const url = settings.carddavAddressBookUrl.trim(); if (!url) throw new Error("Discover and select an iCloud address book before syncing.");
  const response = await requestUrl({ url, method: "REPORT", headers: { ...authHeaders(settings), Depth: "1", Accept: "application/xml, text/xml, text/vcard", "Content-Type": "application/xml; charset=utf-8" }, body: "<?xml version=\"1.0\"?><c:addressbook-query xmlns:d=\"DAV:\" xmlns:c=\"urn:ietf:params:xml:ns:carddav\"><d:prop><d:getetag/><d:getcontenttype/><c:address-data/></d:prop></c:addressbook-query>" });
  const resources: CardDavResource[] = []; for (const chunk of responseChunks(response.text)) { const href = firstTag(chunk, "href"); const etag = firstTag(chunk, "getetag"); const data = firstTag(chunk, "address-data"); if (href && data) resources.push({ href: absoluteHref(href, url), etag, vcardText: data }); } return resources;
}
function authHeaders(settings: ContactSettings): Record<string, string> { const token = `${settings.username}:${settings.appPassword}`; return settings.username && settings.appPassword ? { Authorization: `Basic ${btoa(token)}` } : {}; }
