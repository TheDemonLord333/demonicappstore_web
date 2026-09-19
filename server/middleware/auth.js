'use strict';

function requireAdmin(req, res, next) {
  if (req.session && req.session.userId) {
    return next();
  }
  return res.status(401).json({ error: 'Nicht authentifiziert.' });
}

module.exports = { requireAdmin };
