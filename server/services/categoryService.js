'use strict';

const db = require('../database/db');
const { slugify } = require('../utils/slugify');

function toDto(row) {
  return {
    id: row.slug,
    name: row.name,
    sortOrder: row.sort_order,
  };
}

function listCategories() {
  const rows = db.prepare('SELECT * FROM categories ORDER BY sort_order ASC, name ASC').all();
  return rows.map(toDto);
}

function getCategoryRowBySlug(slug) {
  return db.prepare('SELECT * FROM categories WHERE slug = ?').get(slug);
}

function createCategory({ name, sortOrder }) {
  const slug = slugify(name);
  if (!slug) {
    const err = new Error('Ungültiger Kategoriename.');
    err.status = 400;
    throw err;
  }
  const existing = getCategoryRowBySlug(slug);
  if (existing) {
    const err = new Error('Diese Kategorie existiert bereits.');
    err.status = 409;
    throw err;
  }
  db.prepare('INSERT INTO categories (slug, name, sort_order) VALUES (?, ?, ?)').run(
    slug,
    name.trim(),
    Number.isFinite(sortOrder) ? sortOrder : 0
  );
  return toDto(getCategoryRowBySlug(slug));
}

function updateCategory(slug, { name, sortOrder }) {
  const row = getCategoryRowBySlug(slug);
  if (!row) {
    const err = new Error('Kategorie nicht gefunden.');
    err.status = 404;
    throw err;
  }
  db.prepare('UPDATE categories SET name = ?, sort_order = ? WHERE id = ?').run(
    name !== undefined ? name.trim() : row.name,
    Number.isFinite(sortOrder) ? sortOrder : row.sort_order,
    row.id
  );
  return toDto(getCategoryRowBySlug(slug));
}

function deleteCategory(slug) {
  const row = getCategoryRowBySlug(slug);
  if (!row) {
    const err = new Error('Kategorie nicht gefunden.');
    err.status = 404;
    throw err;
  }
  db.prepare('DELETE FROM categories WHERE id = ?').run(row.id);
}

module.exports = {
  listCategories,
  getCategoryRowBySlug,
  createCategory,
  updateCategory,
  deleteCategory,
};
