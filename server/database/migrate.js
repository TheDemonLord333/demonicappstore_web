'use strict';

const fs = require('fs');
const path = require('path');
const db = require('./db');

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

function run() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename   TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );
  `);

  const applied = new Set(
    db.prepare('SELECT filename FROM schema_migrations').all().map((r) => r.filename)
  );

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const insertApplied = db.prepare('INSERT INTO schema_migrations (filename) VALUES (?)');

  let count = 0;
  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    const apply = db.transaction(() => {
      db.exec(sql);
      insertApplied.run(file);
    });
    apply();
    count += 1;
    // eslint-disable-next-line no-console
    console.log(`[migrate] applied ${file}`);
  }

  if (count === 0) {
    // eslint-disable-next-line no-console
    console.log('[migrate] Datenbank ist bereits aktuell.');
  } else {
    // eslint-disable-next-line no-console
    console.log(`[migrate] ${count} Migration(en) angewendet.`);
  }
}

if (require.main === module) {
  run();
}

module.exports = { run };
