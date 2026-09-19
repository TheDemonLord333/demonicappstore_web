'use strict';

const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

function toInt(value, fallback) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}

function toBool(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  return value === '1' || value.toLowerCase() === 'true';
}

const root = path.join(__dirname, '..', '..');

const config = {
  root,
  env: process.env.NODE_ENV || 'development',
  isProduction: (process.env.NODE_ENV || 'development') === 'production',
  port: toInt(process.env.PORT, 3009),
  baseUrl: (process.env.BASE_URL || 'http://localhost:3009').replace(/\/+$/, ''),

  dbPath: path.resolve(root, process.env.DB_PATH || './data/store.db'),

  sessionSecret: process.env.SESSION_SECRET || 'insecure-dev-secret-change-me',
  sessionCookieName: process.env.SESSION_COOKIE_NAME || 'demonic.sid',
  sessionTtlMs: toInt(process.env.SESSION_TTL_HOURS, 12) * 60 * 60 * 1000,

  uploadDir: path.resolve(root, process.env.UPLOAD_DIR || './uploads'),
  maxIpaSizeBytes: toInt(process.env.MAX_IPA_SIZE_MB, 500) * 1024 * 1024,
  maxIconSizeBytes: toInt(process.env.MAX_ICON_SIZE_MB, 5) * 1024 * 1024,
  maxScreenshotSizeBytes: toInt(process.env.MAX_SCREENSHOT_SIZE_MB, 10) * 1024 * 1024,

  rateLimitWindowMs: toInt(process.env.RATE_LIMIT_WINDOW_MINUTES, 15) * 60 * 1000,
  rateLimitMax: toInt(process.env.RATE_LIMIT_MAX, 300),
  loginRateLimitMax: toInt(process.env.LOGIN_RATE_LIMIT_MAX, 10),

  trustProxy: toBool(process.env.TRUST_PROXY, false),
};

if (config.isProduction && config.sessionSecret === 'insecure-dev-secret-change-me') {
  // eslint-disable-next-line no-console
  console.warn(
    '[WARN] SESSION_SECRET wurde nicht gesetzt – bitte in der .env einen langen zufälligen Wert hinterlegen!'
  );
}

module.exports = config;
