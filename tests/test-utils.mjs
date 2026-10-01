import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const source = readFileSync("src/carddav.ts", "utf8");
assert.match(source, /parseVCard/); assert.match(source, /UID/); assert.match(source, /NOTE/);
const repo = readFileSync("src/repository.ts", "utf8");
assert.match(repo, /syncReadOnly/); assert.match(repo, /missing-remotely/); assert.doesNotMatch(repo, /method:\s*["'](?:PUT|DELETE)/i);
console.log("Validated Personal CRM CardDAV safety markers.");
