'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const config = require('../config/env');
const { isValidSlug } = require('../utils/slugify');
const { safeJoin } = require('../utils/safePath');

const IMAGE_MIME_EXT = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
};

function appIdFromRequest(req) {
  const id = req.params.id;
  if (!isValidSlug(id)) {
    throw new Error('Ungültige App-ID.');
  }
  return id;
}

function makeImageStorage(subdir) {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      try {
        const appId = appIdFromRequest(req);
        const dir = safeJoin(config.uploadDir, subdir, appId);
        fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
      } catch (err) {
        cb(err);
      }
    },
    filename: (req, file, cb) => {
      const ext = IMAGE_MIME_EXT[file.mimetype];
      if (!ext) return cb(new Error('Nicht unterstützter Bildtyp.'));
      const unique = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`;
      cb(null, unique);
    },
  });
}

function imageFileFilter(req, file, cb) {
  if (!IMAGE_MIME_EXT[file.mimetype]) {
    return cb(new Error('Nur PNG, JPEG oder WebP sind erlaubt.'));
  }
  return cb(null, true);
}

const uploadIcon = multer({
  storage: makeImageStorage('icons'),
  fileFilter: imageFileFilter,
  limits: { fileSize: config.maxIconSizeBytes, files: 1 },
});

const uploadScreenshots = multer({
  storage: makeImageStorage('screenshots'),
  fileFilter: imageFileFilter,
  limits: { fileSize: config.maxScreenshotSizeBytes, files: 10 },
});

// Ziel-Verzeichnis/Dateiname basieren bewusst auf Routen-Parametern
// (App-ID + numerische Versions-ID), die von Express bereits vor Multer
// validiert/geroutet wurden – nicht auf Multipart-Body-Feldern, deren
// Verfügbarkeit während des Streamings vom Feld-Reihenfolge abhängt.
const ipaStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      const appId = appIdFromRequest(req);
      const versionId = req.params.versionId;
      if (!/^\d+$/.test(String(versionId))) {
        throw new Error('Ungültige Versions-ID.');
      }
      const dir = safeJoin(config.uploadDir, 'apps', appId, versionId);
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    } catch (err) {
      cb(err);
    }
  },
  filename: (req, file, cb) => {
    cb(null, `${req.params.id}-${req.params.versionId}.ipa`);
  },
});

function ipaFileFilter(req, file, cb) {
  const lower = (file.originalname || '').toLowerCase();
  const isIpaExt = lower.endsWith('.ipa');
  const allowedMime = ['application/octet-stream', 'application/x-itunes-ipa', 'application/zip'];
  if (!isIpaExt || !allowedMime.includes(file.mimetype)) {
    return cb(new Error('Nur .ipa-Dateien sind erlaubt.'));
  }
  return cb(null, true);
}

const uploadIpa = multer({
  storage: ipaStorage,
  fileFilter: ipaFileFilter,
  limits: { fileSize: config.maxIpaSizeBytes, files: 1 },
});

module.exports = { uploadIcon, uploadScreenshots, uploadIpa };
