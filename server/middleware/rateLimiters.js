'use strict';

const rateLimit = require('express-rate-limit');
const config = require('../config/env');

const apiLimiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Zu viele Anfragen. Bitte später erneut versuchen.' },
});

const loginLimiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.loginRateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { error: 'Zu viele Anmeldeversuche. Bitte später erneut versuchen.' },
});

module.exports = { apiLimiter, loginLimiter };
