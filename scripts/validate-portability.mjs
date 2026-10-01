import { readFileSync } from "node:fs";
const files = ["manifest.json", "main.js", "styles.css", "README.md"];
for (const file of files) { const text = readFileSync(file, "utf8"); if (/C:\\Users\\|iCloudDrive|\.env|BEGIN PRIVATE KEY/i.test(text)) throw new Error(`Portability violation in ${file}`); }
if (!readFileSync("manifest.json", "utf8").includes('"isDesktopOnly": false')) throw new Error("Plugin must remain mobile-compatible");
console.log("Validated Personal CRM portability.");
