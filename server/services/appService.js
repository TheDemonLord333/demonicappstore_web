'use strict';

const fs = require('fs');
const db = require('../database/db');
const config = require('../config/env');
const { isValidSlug } = require('../utils/slugify');
const { safeJoin } = require('../utils/safePath');

function notFound(message) {
  const err = new Error(message);
  err.status = 404;
  return err;
}
function badRequest(message) {
  const err = new Error(message);
  err.status = 400;
  return err;
}
function conflict(message) {
  const err = new Error(message);
  err.status = 409;
  return err;
}

const CURRENT_VERSION_SQL = `
  SELECT * FROM app_versions
  WHERE app_id = ? AND is_current = 1
  ORDER BY created_at DESC LIMIT 1
`;

function getCurrentVersionRow(appId) {
  return db.prepare(CURRENT_VERSION_SQL).get(appId);
}

function getCategoryName(categoryId) {
  if (!categoryId) return null;
  const row = db.prepare('SELECT name, slug FROM categories WHERE id = ?').get(categoryId);
  return row || null;
}

function toPublicDto(appRow) {
  const current = getCurrentVersionRow(appRow.id);
  const category = getCategoryName(appRow.category_id);

  return {
    id: appRow.slug,
    name: appRow.name,
    bundleId: appRow.bundle_id,
    description: appRow.description,
    category: category ? category.name : null,
    categorySlug: category ? category.slug : null,
    icon: appRow.icon_path || null,
    version: current ? current.version : null,
    build: current ? current.build : null,
    releaseNotes: current ? current.release_notes : null,
    distributionType: appRow.distribution_type,
    installUrl: appRow.install_url,
    manifestUrl: appRow.manifest_url || `${config.baseUrl}/api/apps/${appRow.slug}/manifest`,
    status: appRow.status,
    featured: !!appRow.featured,
    updatedAt: appRow.updated_at,
    createdAt: appRow.created_at,
  };
}

function toAdminDto(appRow) {
  return {
    ...toPublicDto(appRow),
    sortOrder: appRow.sort_order,
  };
}

function toVersionDto(row) {
  return {
    id: row.id,
    version: row.version,
    build: row.build,
    releaseNotes: row.release_notes,
    ipaPath: row.ipa_path,
    ipaSize: row.ipa_size,
    manifestUrl: row.manifest_url,
    isCurrent: !!row.is_current,
    createdAt: row.created_at,
  };
}

function getAppRow(slug) {
  return db.prepare('SELECT * FROM apps WHERE slug = ?').get(slug);
}

function requireAppRow(slug) {
  const row = getAppRow(slug);
  if (!row) throw notFound('App nicht gefunden.');
  return row;
}

function listApps({ includeAll = false } = {}) {
  const rows = includeAll
    ? db.prepare('SELECT * FROM apps ORDER BY sort_order ASC, name ASC').all()
    : db
        .prepare("SELECT * FROM apps WHERE status = 'active' ORDER BY sort_order ASC, name ASC")
        .all();
  return rows.map(includeAll ? toAdminDto : toPublicDto);
}

function getAppDetail(slug, { includeAll = false } = {}) {
  const row = getAppRow(slug);
  if (!row) throw notFound('App nicht gefunden.');
  if (!includeAll && row.status !== 'active') throw notFound('App nicht gefunden.');

  const versions = db
    .prepare('SELECT * FROM app_versions WHERE app_id = ? ORDER BY created_at DESC')
    .all(row.id)
    .map(toVersionDto);

  const screenshots = db
    .prepare('SELECT * FROM screenshots WHERE app_id = ? ORDER BY sort_order ASC, id ASC')
    .all(row.id)
    .map((s) => s.path);

  return {
    ...(includeAll ? toAdminDto(row) : toPublicDto(row)),
    versions,
    screenshots,
  };
}

function listVersions(slug) {
  const row = requireAppRow(slug);
  return db
    .prepare('SELECT * FROM app_versions WHERE app_id = ? ORDER BY created_at DESC')
    .all(row.id)
    .map(toVersionDto);
}

function createApp(data) {
  const { id, name, bundleId, description, category, distributionType, installUrl, manifestUrl, featured } =
    data;

  if (!isValidSlug(id)) {
    throw badRequest('App-ID muss aus Kleinbuchstaben, Ziffern und Bindestrichen bestehen.');
  }
  if (getAppRow(id)) {
    throw conflict('Eine App mit dieser ID existiert bereits.');
  }

  let categoryId = null;
  if (category) {
    const catRow = db.prepare('SELECT id FROM categories WHERE slug = ?').get(category);
    if (!catRow) throw badRequest('Unbekannte Kategorie.');
    categoryId = catRow.id;
  }

  db.prepare(
    `INSERT INTO apps (slug, name, bundle_id, description, category_id, distribution_type, install_url, manifest_url, featured)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    name.trim(),
    bundleId.trim(),
    description ? description.trim() : '',
    categoryId,
    distributionType || 'manifest',
    installUrl || null,
    manifestUrl || null,
    featured ? 1 : 0
  );

  return getAppDetail(id, { includeAll: true });
}

function updateApp(slug, data) {
  const row = requireAppRow(slug);
  const { name, bundleId, description, category, distributionType, installUrl, manifestUrl, status, featured, sortOrder } =
    data;

  let categoryId = row.category_id;
  if (category !== undefined) {
    if (category === null || category === '') {
      categoryId = null;
    } else {
      const catRow = db.prepare('SELECT id FROM categories WHERE slug = ?').get(category);
      if (!catRow) throw badRequest('Unbekannte Kategorie.');
      categoryId = catRow.id;
    }
  }

  db.prepare(
    `UPDATE apps SET
      name = ?, bundle_id = ?, description = ?, category_id = ?,
      distribution_type = ?, install_url = ?, manifest_url = ?,
      status = ?, featured = ?, sort_order = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
     WHERE id = ?`
  ).run(
    name !== undefined ? name.trim() : row.name,
    bundleId !== undefined ? bundleId.trim() : row.bundle_id,
    description !== undefined ? description.trim() : row.description,
    categoryId,
    distributionType !== undefined ? distributionType : row.distribution_type,
    installUrl !== undefined ? installUrl : row.install_url,
    manifestUrl !== undefined ? manifestUrl : row.manifest_url,
    status !== undefined ? status : row.status,
    featured !== undefined ? (featured ? 1 : 0) : row.featured,
    Number.isFinite(sortOrder) ? sortOrder : row.sort_order,
    row.id
  );

  return getAppDetail(slug, { includeAll: true });
}

function deleteApp(slug) {
  const row = requireAppRow(slug);
  db.prepare('DELETE FROM apps WHERE id = ?').run(row.id);

  for (const dir of ['icons', 'screenshots', 'apps']) {
    try {
      const target = safeJoin(config.uploadDir, dir, slug);
      fs.rmSync(target, { recursive: true, force: true });
    } catch {
      // Aufräumen ist best-effort; DB-Löschung hat bereits stattgefunden.
    }
  }
}

function setAppIcon(slug, publicPath) {
  const row = requireAppRow(slug);
  db.prepare(
    "UPDATE apps SET icon_path = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?"
  ).run(publicPath, row.id);
  return getAppDetail(slug, { includeAll: true });
}

function addScreenshot(slug, publicPath) {
  const row = requireAppRow(slug);
  const maxOrder = db
    .prepare('SELECT COALESCE(MAX(sort_order), -1) AS m FROM screenshots WHERE app_id = ?')
    .get(row.id).m;
  db.prepare('INSERT INTO screenshots (app_id, path, sort_order) VALUES (?, ?, ?)').run(
    row.id,
    publicPath,
    maxOrder + 1
  );
  return getAppDetail(slug, { includeAll: true });
}

function removeScreenshot(slug, screenshotId) {
  const row = requireAppRow(slug);
  const shot = db
    .prepare('SELECT * FROM screenshots WHERE id = ? AND app_id = ?')
    .get(screenshotId, row.id);
  if (!shot) throw notFound('Screenshot nicht gefunden.');

  db.prepare('DELETE FROM screenshots WHERE id = ?').run(shot.id);

  try {
    fs.rmSync(safeJoin(config.root, shot.path.replace(/^\//, '')), { force: true });
  } catch {
    // best effort
  }

  return getAppDetail(slug, { includeAll: true });
}

function addVersion(slug, { version, build, releaseNotes }) {
  const row = requireAppRow(slug);
  if (!version || !/^[a-zA-Z0-9.+_-]{1,40}$/.test(version)) {
    throw badRequest('Ungültige Versionsnummer.');
  }
  const existing = db
    .prepare('SELECT id FROM app_versions WHERE app_id = ? AND version = ?')
    .get(row.id, version);
  if (existing) throw conflict('Diese Version existiert bereits.');

  const info = db
    .prepare(
      'INSERT INTO app_versions (app_id, version, build, release_notes) VALUES (?, ?, ?, ?)'
    )
    .run(row.id, version, Number.isFinite(build) ? build : 1, releaseNotes || '');

  return db.prepare('SELECT * FROM app_versions WHERE id = ?').get(info.lastInsertRowid);
}

function updateVersion(slug, versionId, { build, releaseNotes }) {
  const row = requireAppRow(slug);
  const versionRow = db
    .prepare('SELECT * FROM app_versions WHERE id = ? AND app_id = ?')
    .get(versionId, row.id);
  if (!versionRow) throw notFound('Version nicht gefunden.');

  db.prepare('UPDATE app_versions SET build = ?, release_notes = ? WHERE id = ?').run(
    Number.isFinite(build) ? build : versionRow.build,
    releaseNotes !== undefined ? releaseNotes : versionRow.release_notes,
    versionRow.id
  );
  return db.prepare('SELECT * FROM app_versions WHERE id = ?').get(versionRow.id);
}

function deleteVersion(slug, versionId) {
  const row = requireAppRow(slug);
  const versionRow = db
    .prepare('SELECT * FROM app_versions WHERE id = ? AND app_id = ?')
    .get(versionId, row.id);
  if (!versionRow) throw notFound('Version nicht gefunden.');

  db.prepare('DELETE FROM app_versions WHERE id = ?').run(versionRow.id);

  if (versionRow.ipa_path) {
    try {
      fs.rmSync(safeJoin(config.root, versionRow.ipa_path.replace(/^\//, '')), { force: true });
    } catch {
      // best effort
    }
  }
}

function publishVersion(slug, versionId) {
  const row = requireAppRow(slug);
  const versionRow = db
    .prepare('SELECT * FROM app_versions WHERE id = ? AND app_id = ?')
    .get(versionId, row.id);
  if (!versionRow) throw notFound('Version nicht gefunden.');

  const publish = db.transaction(() => {
    db.prepare('UPDATE app_versions SET is_current = 0 WHERE app_id = ?').run(row.id);
    db.prepare('UPDATE app_versions SET is_current = 1 WHERE id = ?').run(versionRow.id);
    db.prepare(
      "UPDATE apps SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?"
    ).run(row.id);
  });
  publish();

  return getAppDetail(slug, { includeAll: true });
}

function setVersionIpa(slug, versionId, { publicPath, size }) {
  const row = requireAppRow(slug);
  const versionRow = db
    .prepare('SELECT * FROM app_versions WHERE id = ? AND app_id = ?')
    .get(versionId, row.id);
  if (!versionRow) throw notFound('Version nicht gefunden.');

  db.prepare('UPDATE app_versions SET ipa_path = ?, ipa_size = ? WHERE id = ?').run(
    publicPath,
    size,
    versionRow.id
  );
  return db.prepare('SELECT * FROM app_versions WHERE id = ?').get(versionRow.id);
}

module.exports = {
  listApps,
  getAppDetail,
  getAppRow,
  requireAppRow,
  listVersions,
  createApp,
  updateApp,
  deleteApp,
  setAppIcon,
  addScreenshot,
  removeScreenshot,
  addVersion,
  updateVersion,
  deleteVersion,
  publishVersion,
  setVersionIpa,
  toVersionDto,
  getCurrentVersionRow,
};
