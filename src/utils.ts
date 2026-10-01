import { normalizePath } from "obsidian";
export function cleanPath(value: string, fallback: string): string { const cleaned = value.trim().replace(/\\/g, "/").replace(/^\/+|\/+$/g, ""); return normalizePath(cleaned || fallback); }
export function safeName(value: string): string { return value.trim().replace(/[\\/:*?"<>|#]/g, "-").replace(/\s+/g, " ").slice(0, 100) || "Unnamed contact"; }
export function today(): string { return new Date().toISOString().slice(0, 10); }
export function isoNow(): string { return new Date().toISOString(); }
export function normalizeValue(value: string): string { return value.toLowerCase().replace(/[^a-z0-9]/g, ""); }
export function listValue(value: unknown): string[] { return Array.isArray(value) ? value.map(String).filter(Boolean) : typeof value === "string" && value.trim() ? [value.trim()] : []; }
export function yamlQuote(value: string): string { return JSON.stringify(value); }
