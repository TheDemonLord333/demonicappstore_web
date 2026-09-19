'use strict';

/**
 * Erzeugt aus einem beliebigen String eine sichere, dateisystem- und
 * URL-taugliche Slug-ID (nur [a-z0-9-]). Wird u.a. als App-ID verwendet,
 * die auch als Verzeichnisname für Uploads dient – daher strikt validiert.
 */
function slugify(input) {
  return String(input)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function isValidSlug(value) {
  return typeof value === 'string' && value.length >= 1 && value.length <= 80 && SLUG_PATTERN.test(value);
}

module.exports = { slugify, isValidSlug, SLUG_PATTERN };
