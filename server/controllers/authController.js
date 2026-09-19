'use strict';

const bcrypt = require('bcrypt');
const db = require('../database/db');
const asyncHandler = require('../utils/asyncHandler');
const { issueCsrfToken } = require('../middleware/csrf');

const GENERIC_ERROR = 'Benutzername oder Passwort ist falsch.';

const login = asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: GENERIC_ERROR });
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user) {
    // Timing-Angriffe zur Benutzernamen-Enumeration erschweren.
    await bcrypt.hash(password, 12);
    return res.status(401).json({ error: GENERIC_ERROR });
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: GENERIC_ERROR });
  }

  db.prepare('UPDATE users SET last_login_at = strftime(\'%Y-%m-%dT%H:%M:%fZ\', \'now\') WHERE id = ?').run(
    user.id
  );

  // Session-Regenerierung verhindert Session-Fixation.
  req.session.regenerate((err) => {
    if (err) return res.status(500).json({ error: 'Anmeldung fehlgeschlagen.' });

    req.session.userId = user.id;
    req.session.username = user.username;
    const csrfToken = issueCsrfToken(req);

    req.session.save((saveErr) => {
      if (saveErr) return res.status(500).json({ error: 'Anmeldung fehlgeschlagen.' });
      return res.json({ user: { username: user.username }, csrfToken });
    });
  });
});

const logout = (req, res) => {
  req.session.destroy(() => {
    res.clearCookie(req.app.get('sessionCookieName'));
    res.json({ ok: true });
  });
};

const me = (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Nicht authentifiziert.' });
  }
  const csrfToken = req.session.csrfToken || issueCsrfToken(req);
  return res.json({ user: { username: req.session.username }, csrfToken });
};

module.exports = { login, logout, me };
