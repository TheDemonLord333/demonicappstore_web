'use strict';

const express = require('express');
const { body } = require('express-validator');
const controller = require('../controllers/authController');
const validate = require('../utils/validate');
const { loginLimiter } = require('../middleware/rateLimiters');

const router = express.Router();

router.post(
  '/login',
  loginLimiter,
  body('username').isString().trim().isLength({ min: 1, max: 100 }),
  body('password').isString().isLength({ min: 1, max: 200 }),
  validate,
  controller.login
);

router.post('/logout', controller.logout);
router.get('/me', controller.me);

module.exports = router;
