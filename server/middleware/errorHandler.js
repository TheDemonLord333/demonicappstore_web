'use strict';

const multer = require('multer');
const config = require('../config/env');

function notFoundHandler(req, res) {
  res.status(404).json({ error: 'Ressource nicht gefunden.' });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: `Upload-Fehler: ${err.message}` });
  }

  const status = err.status || err.statusCode || 500;

  if (status >= 500) {
    // eslint-disable-next-line no-console
    console.error('[error]', err);
  }

  const message =
    status >= 500 && config.isProduction
      ? 'Interner Serverfehler.'
      : err.message || 'Unbekannter Fehler.';

  res.status(status).json({ error: message });
}

module.exports = { notFoundHandler, errorHandler };
