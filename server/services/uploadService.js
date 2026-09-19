'use strict';

const fs = require('fs');
const path = require('path');
const config = require('../config/env');

/**
 * Wandelt einen absoluten Datenpfad innerhalb von uploadDir in einen
 * öffentlichen, unter /uploads/... erreichbaren URL-Pfad um.
 */
function toPublicPath(absolutePath) {
  const relative = path.relative(config.uploadDir, absolutePath).split(path.sep).join('/');
  return `/uploads/${relative}`;
}

/**
 * Prüft die Magic Bytes einer IPA-Datei: eine IPA ist ein ZIP-Archiv und
 * beginnt daher mit der Signatur "PK". Verhindert, dass beliebige, lediglich
 * umbenannte Dateien als IPA akzeptiert werden.
 */
function isLikelyZip(filePath) {
  const fd = fs.openSync(filePath, 'r');
  try {
    const buffer = Buffer.alloc(4);
    fs.readSync(fd, buffer, 0, 4, 0);
    return buffer[0] === 0x50 && buffer[1] === 0x4b;
  } finally {
    fs.closeSync(fd);
  }
}

module.exports = { toPublicPath, isLikelyZip };
