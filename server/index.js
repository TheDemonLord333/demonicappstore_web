'use strict';

const config = require('./config/env');
const { run: migrate } = require('./database/migrate');

// Migration MUSS laufen, bevor app.js geladen wird: die Session-Middleware
// erstellt beim Modul-Laden bereits vorbereitete Statements gegen die
// "sessions"-Tabelle, die auf einer frischen Datenbank sonst noch fehlt.
migrate();

const app = require('./app');

const server = app.listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log(`[demonic-app-store] läuft auf Port ${config.port} (${config.env})`);
  // eslint-disable-next-line no-console
  console.log(`[demonic-app-store] Basis-URL: ${config.baseUrl}`);
});

function shutdown(signal) {
  // eslint-disable-next-line no-console
  console.log(`[demonic-app-store] ${signal} empfangen, fahre herunter...`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
