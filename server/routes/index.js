'use strict';

const express = require('express');

const router = express.Router();

router.get('/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

router.use('/apps', require('./apps'));
router.use('/categories', require('./categories'));
router.use('/auth', require('./auth'));
router.use('/admin', require('./admin'));

module.exports = router;
