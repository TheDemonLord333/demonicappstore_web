'use strict';

/**
 * CLI-Tool zum Anlegen/Zurücksetzen eines Admin-Benutzers.
 *
 * Verwendung:
 *   node server/database/create-admin.js --username admin --password "MeinSicheresPasswort123!"
 *
 * Ohne --password wird interaktiv (verdeckt) nach einem Passwort gefragt.
 */

const readline = require('readline');
const bcrypt = require('bcrypt');
const db = require('./db');
const { run: migrate } = require('./migrate');

const BCRYPT_ROUNDS = 12;

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i].startsWith('--')) {
      const key = argv[i].slice(2);
      const value = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : true;
      args[key] = value;
      if (value !== true) i += 1;
    }
  }
  return args;
}

function promptHidden(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const stdin = process.stdin;
    process.stdout.write(question);

    let input = '';
    const onData = (char) => {
      char = char.toString('utf8');
      if (char === '\n' || char === '\r' || char === '\u0004') {
        stdin.removeListener('data', onData);
        stdin.setRawMode && stdin.setRawMode(false);
        process.stdout.write('\n');
        rl.close();
        resolve(input);
        return;
      }
      if (char === '\u0003') {
        process.exit(1);
      }
      if (char === '\u007f') {
        input = input.slice(0, -1);
        return;
      }
      input += char;
    };

    stdin.setRawMode && stdin.setRawMode(true);
    stdin.resume();
    stdin.on('data', onData);
  });
}

async function main() {
  migrate();

  const args = parseArgs(process.argv.slice(2));
  const username = args.username || 'admin';

  let password = typeof args.password === 'string' ? args.password : null;
  if (!password) {
    password = await promptHidden(`Passwort für Admin-Benutzer "${username}": `);
  }

  if (!password || password.length < 10) {
    // eslint-disable-next-line no-console
    console.error('[create-admin] Passwort muss mindestens 10 Zeichen lang sein.');
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) {
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, existing.id);
    // eslint-disable-next-line no-console
    console.log(`[create-admin] Passwort für bestehenden Benutzer "${username}" aktualisiert.`);
  } else {
    db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)').run(
      username,
      passwordHash,
      'admin'
    );
    // eslint-disable-next-line no-console
    console.log(`[create-admin] Admin-Benutzer "${username}" wurde angelegt.`);
  }

  process.exit(0);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[create-admin] Fehler:', err);
  process.exit(1);
});
