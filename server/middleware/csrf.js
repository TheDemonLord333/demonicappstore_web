'use strict';

const crypto = require('crypto');

const HEADER_NAME = 'x-csrf-token';

function issueCsrfToken(req) {
  const token = crypto.randomBytes(32).toString('hex');
  req.session.csrfToken = token;
  return token;
}

/**
 * Double-Submit-CSRF-Schutz: Der Token wird beim Login serverseitig in der
 * Session abgelegt und dem Client im JSON-Response-Body mitgeteilt (nicht
 * über ein für JS lesbares Cookie). Der Client muss ihn bei jeder
 * zustandsändernden Admin-Anfrage im Header mitschicken. Eine fremde Seite
 * kann diesen Header nicht gültig setzen, da sie den Token nicht kennt
 * (Same-Origin-Policy verhindert das Auslesen der JSON-Response).
 */
function verifyCsrf(req, res, next) {
  const headerToken = req.get(HEADER_NAME);
  const sessionToken = req.session && req.session.csrfToken;

  if (!sessionToken || !headerToken || headerToken !== sessionToken) {
    return res.status(403).json({ error: 'Ungültiges oder fehlendes CSRF-Token.' });
  }
  return next();
}

module.exports = { issueCsrfToken, verifyCsrf, HEADER_NAME };
