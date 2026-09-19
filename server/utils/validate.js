'use strict';

const { validationResult } = require('express-validator');

// Zentrale Auswertung von express-validator-Ketten. Bei Fehlern wird eine
// einheitliche 400-Antwort erzeugt, ohne interne Details preiszugeben.
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Ungültige Eingabe.',
      details: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  return next();
}

module.exports = validate;
