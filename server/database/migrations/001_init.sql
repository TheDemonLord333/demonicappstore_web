-- Demonic App Store – initiales Schema
-- Hinweis: Die Zugriffsschicht (server/database/db.js sowie die services/*)
-- kapselt SQL-Zugriffe, sodass ein späterer Wechsel auf PostgreSQL/MariaDB
-- primär eine Anpassung dort erfordert, nicht in der restlichen Anwendung.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role          TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin')),
    created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    last_login_at TEXT
);

CREATE TABLE IF NOT EXISTS categories (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    slug        TEXT NOT NULL UNIQUE,
    name        TEXT NOT NULL,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS apps (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    slug              TEXT NOT NULL UNIQUE,
    name              TEXT NOT NULL,
    bundle_id         TEXT NOT NULL,
    description       TEXT NOT NULL DEFAULT '',
    category_id       INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    icon_path         TEXT,
    distribution_type TEXT NOT NULL DEFAULT 'manifest' CHECK (distribution_type IN ('manifest', 'direct', 'testflight', 'external')),
    install_url       TEXT,
    manifest_url      TEXT,
    status            TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'unavailable', 'draft')),
    featured          INTEGER NOT NULL DEFAULT 0,
    sort_order        INTEGER NOT NULL DEFAULT 0,
    created_at        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_apps_category ON apps(category_id);
CREATE INDEX IF NOT EXISTS idx_apps_status ON apps(status);

CREATE TABLE IF NOT EXISTS app_versions (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    app_id        INTEGER NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
    version       TEXT NOT NULL,
    build         INTEGER NOT NULL DEFAULT 1,
    release_notes TEXT NOT NULL DEFAULT '',
    ipa_path      TEXT,
    ipa_size      INTEGER,
    manifest_url  TEXT,
    is_current    INTEGER NOT NULL DEFAULT 0,
    created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    UNIQUE (app_id, version)
);

CREATE INDEX IF NOT EXISTS idx_versions_app ON app_versions(app_id);
CREATE INDEX IF NOT EXISTS idx_versions_current ON app_versions(app_id, is_current);

CREATE TABLE IF NOT EXISTS screenshots (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    app_id     INTEGER NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
    path       TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_screenshots_app ON screenshots(app_id);

-- Sitzungsspeicher (persistenter, eigener Session-Store statt In-Memory,
-- damit Admin-Sessions PM2-Neustarts überleben und für mehrere Prozesse
-- vorbereitet sind).
CREATE TABLE IF NOT EXISTS sessions (
    sid        TEXT PRIMARY KEY,
    data       TEXT NOT NULL,
    expires_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

INSERT OR IGNORE INTO categories (slug, name, sort_order) VALUES
    ('games', 'Games', 1),
    ('tools', 'Tools', 2),
    ('music', 'Music', 3),
    ('media', 'Media', 4),
    ('development', 'Development', 5),
    ('other', 'Other', 6);
