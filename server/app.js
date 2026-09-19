'use strict';

const path = require('path');
const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const session = require('express-session');

const config = require('./config/env');
const SqliteSessionStore = require('./middleware/sqliteSessionStore');
const { apiLimiter } = require('./middleware/rateLimiters');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
const apiRouter = require('./routes/index');

const CLIENT_DIR = path.join(config.root, 'client');

const app = express();

if (config.trustProxy) {
  app.set('trust proxy', 1);
}

app.set('sessionCookieName', config.sessionCookieName);

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'blob:'],
        fontSrc: ["'self'"],
        connectSrc: ["'self'"],
        manifestSrc: ["'self'"],
        workerSrc: ["'self'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
        upgradeInsecureRequests: config.isProduction ? [] : null,
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

app.use(compression());

if (!config.isProduction) {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

app.use(
  session({
    store: new SqliteSessionStore({ ttlMs: config.sessionTtlMs }),
    name: config.sessionCookieName,
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      secure: config.isProduction,
      sameSite: 'lax',
      maxAge: config.sessionTtlMs,
    },
  })
);

app.use('/api', apiLimiter, apiRouter);

// Hochgeladene Dateien: statisch, ohne Verzeichnisauflistung, ohne Ausführung.
app.use(
  '/uploads',
  express.static(config.uploadDir, {
    index: false,
    dotfiles: 'deny',
    setHeaders: (res) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
    },
  })
);

// Statische Client-Assets (SPA). Kein Cache auf index.html, damit
// Deployments sofort sichtbar werden (wichtig für WKWebView-Wrapper).
app.use(
  express.static(CLIENT_DIR, {
    index: false,
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('index.html') || filePath.endsWith('service-worker.js')) {
        res.setHeader('Cache-Control', 'no-cache');
      }
    },
  })
);

// SPA-Fallback: alle nicht auf /api oder /uploads passenden GET-Anfragen mit
// HTML-Accept liefern die App-Shell aus – das Client-Routing übernimmt dann
// anhand von location.pathname (z. B. /admin, /app/:id).
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next();
  if (!req.accepts('html')) return next();
  res.sendFile(path.join(CLIENT_DIR, 'index.html'));
});

app.use('/api', notFoundHandler);
app.use(errorHandler);

module.exports = app;
