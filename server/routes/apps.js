'use strict';

const express = require('express');
const { param } = require('express-validator');
const controller = require('../controllers/appsController');
const validate = require('../utils/validate');

const router = express.Router();

const idParam = param('id')
  .matches(/^[a-z0-9]+(-[a-z0-9]+)*$/)
  .withMessage('Ungültige App-ID.');

router.get('/', controller.listApps);
router.get('/:id', idParam, validate, controller.getApp);
router.get('/:id/versions', idParam, validate, controller.getAppVersions);
router.get('/:id/manifest', idParam, validate, controller.getManifest);

module.exports = router;
