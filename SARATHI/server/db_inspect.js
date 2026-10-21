import { initDb } from "./src/config/db.js";
const db = initDb();
const rows = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`).all();
console.log(`TABLES: ` + JSON.stringify(rows.map(r => r.name)));
for (const r of rows) {
  const cols = db.prepare(`PRAGMA table_info(` + r.name + `)`).all();
  console.log(`--- ` + r.name + ` ---`);
  console.log(cols.map(c => c.name).join(`, `));
}
process.exit(0);
