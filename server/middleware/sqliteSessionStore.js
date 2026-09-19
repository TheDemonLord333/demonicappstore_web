'use strict';

const session = require('express-session');
const db = require('../database/db');

/**
 * Eigener, minimaler SQLite-Session-Store (better-sqlite3), damit Admin-
 * Sessions PM2-Neustarts überleben und keine zusätzliche Session-Store-
 * Abhängigkeit benötigt wird. Für die überschaubare Nutzerzahl eines
 * privaten Admin-Bereichs vollkommen ausreichend.
 */
class SqliteSessionStore extends session.Store {
  constructor({ ttlMs }) {
    super();
    this.ttlMs = ttlMs;

    this.stmts = {
      get: db.prepare('SELECT data, expires_at FROM sessions WHERE sid = ?'),
      set: db.prepare(
        'INSERT INTO sessions (sid, data, expires_at) VALUES (?, ?, ?) ' +
          'ON CONFLICT(sid) DO UPDATE SET data = excluded.data, expires_at = excluded.expires_at'
      ),
      destroy: db.prepare('DELETE FROM sessions WHERE sid = ?'),
      touch: db.prepare('UPDATE sessions SET expires_at = ? WHERE sid = ?'),
      clearExpired: db.prepare('DELETE FROM sessions WHERE expires_at < ?'),
    };

    this._cleanupTimer = setInterval(() => {
      try {
        this.stmts.clearExpired.run(Date.now());
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[sessionStore] cleanup failed:', err.message);
      }
    }, 15 * 60 * 1000);
    this._cleanupTimer.unref();
  }

  get(sid, callback) {
    try {
      const row = this.stmts.get.get(sid);
      if (!row) return callback(null, null);
      if (row.expires_at < Date.now()) {
        this.stmts.destroy.run(sid);
        return callback(null, null);
      }
      return callback(null, JSON.parse(row.data));
    } catch (err) {
      return callback(err);
    }
  }

  set(sid, sessionData, callback) {
    try {
      const maxAge = sessionData.cookie && sessionData.cookie.maxAge ? sessionData.cookie.maxAge : this.ttlMs;
      const expiresAt = Date.now() + maxAge;
      this.stmts.set.run(sid, JSON.stringify(sessionData), expiresAt);
      return callback(null);
    } catch (err) {
      return callback(err);
    }
  }

  destroy(sid, callback) {
    try {
      this.stmts.destroy.run(sid);
      return callback(null);
    } catch (err) {
      return callback(err);
    }
  }

  touch(sid, sessionData, callback) {
    try {
      const maxAge = sessionData.cookie && sessionData.cookie.maxAge ? sessionData.cookie.maxAge : this.ttlMs;
      this.stmts.touch.run(Date.now() + maxAge, sid);
      return callback(null);
    } catch (err) {
      return callback(err);
    }
  }
}

module.exports = SqliteSessionStore;
