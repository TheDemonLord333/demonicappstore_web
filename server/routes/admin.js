'use strict';

const express = require('express');
const { body, param } = require('express-validator');

const appsController = require('../controllers/adminAppsController');
const categoriesController = require('../controllers/categoriesController');
const validate = require('../utils/validate');
const { requireAdmin } = require('../middleware/auth');
const { verifyCsrf } = require('../middleware/csrf');
const { uploadIcon, uploadScreenshots, uploadIpa } = require('../middleware/upload');

const router = express.Router();

router.use(requireAdmin);

const idParam = param('id')
  .matches(/^[a-z0-9]+(-[a-z0-9]+)*$/)
  .withMessage('Ungültige App-ID.');
const versionIdParam = param('versionId').isInt({ min: 1 }).withMessage('Ungültige Versions-ID.');

const distributionTypes = ['manifest', 'direct', 'testflight', 'external'];
const statuses = ['active', 'unavailable', 'draft'];

const appBodyRulesCreate = [
  body('id')
    .matches(/^[a-z0-9]+(-[a-z0-9]+)*$/)
    .withMessage('App-ID muss aus Kleinbuchstaben, Ziffern und Bindestrichen bestehen.'),
  body('name').isString().trim().isLength({ min: 1, max: 150 }),
  body('bundleId')
    .matches(/^[A-Za-z0-9.-]+$/)
    .withMessage('Ungültige Bundle-ID.'),
  body('description').optional().isString().isLength({ max: 5000 }),
  body('category').optional({ nullable: true }).isString(),
  body('distributionType').optional().isIn(distributionTypes),
  body('installUrl').optional({ nullable: true }).isString().isLength({ max: 2000 }),
  body('manifestUrl').optional({ nullable: true }).isString().isLength({ max: 2000 }),
  body('featured').optional().isBoolean().toBoolean(),
];

const appBodyRulesUpdate = [
  body('name').optional().isString().trim().isLength({ min: 1, max: 150 }),
  body('bundleId')
    .optional()
    .matches(/^[A-Za-z0-9.-]+$/)
    .withMessage('Ungültige Bundle-ID.'),
  body('description').optional().isString().isLength({ max: 5000 }),
  body('category').optional({ nullable: true }).isString(),
  body('distributionType').optional().isIn(distributionTypes),
  body('installUrl').optional({ nullable: true }).isString().isLength({ max: 2000 }),
  body('manifestUrl').optional({ nullable: true }).isString().isLength({ max: 2000 }),
  body('status').optional().isIn(statuses),
  body('featured').optional().isBoolean().toBoolean(),
  body('sortOrder').optional().isInt().toInt(),
];

const versionBodyRules = [
  body('version')
    .matches(/^[a-zA-Z0-9.+_-]{1,40}$/)
    .withMessage('Ungültige Versionsnummer.'),
  body('build').optional().isInt({ min: 0 }).toInt(),
  body('releaseNotes').optional().isString().isLength({ max: 5000 }),
];

// ---- Apps -----------------------------------------------------------
router.get('/apps', appsController.listApps);
router.get('/apps/:id', idParam, validate, appsController.getApp);
router.post('/apps', verifyCsrf, appBodyRulesCreate, validate, appsController.createApp);
router.put('/apps/:id', verifyCsrf, idParam, appBodyRulesUpdate, validate, appsController.updateApp);
router.delete('/apps/:id', verifyCsrf, idParam, validate, appsController.deleteApp);

// ---- Icon & Screenshots ----------------------------------------------
router.post(
  '/apps/:id/icon',
  verifyCsrf,
  idParam,
  validate,
  uploadIcon.single('icon'),
  appsController.uploadIcon
);

router.post(
  '/apps/:id/screenshots',
  verifyCsrf,
  idParam,
  validate,
  uploadScreenshots.array('screenshots', 10),
  appsController.uploadScreenshots
);

router.delete(
  '/apps/:id/screenshots/:screenshotId',
  verifyCsrf,
  idParam,
  param('screenshotId').isInt({ min: 1 }),
  validate,
  appsController.deleteScreenshot
);

// ---- Versionen ---------------------------------------------------------
router.post(
  '/apps/:id/versions',
  verifyCsrf,
  idParam,
  versionBodyRules,
  validate,
  appsController.addVersion
);

router.put(
  '/apps/:id/versions/:versionId',
  verifyCsrf,
  idParam,
  versionIdParam,
  body('build').optional().isInt({ min: 0 }).toInt(),
  body('releaseNotes').optional().isString().isLength({ max: 5000 }),
  validate,
  appsController.updateVersion
);

router.delete(
  '/apps/:id/versions/:versionId',
  verifyCsrf,
  idParam,
  versionIdParam,
  validate,
  appsController.deleteVersion
);

router.post(
  '/apps/:id/versions/:versionId/publish',
  verifyCsrf,
  idParam,
  versionIdParam,
  validate,
  appsController.publishVersion
);

router.post(
  '/apps/:id/versions/:versionId/ipa',
  verifyCsrf,
  idParam,
  versionIdParam,
  validate,
  uploadIpa.single('ipa'),
  appsController.uploadIpa
);

// ---- Kategorien ---------------------------------------------------------
router.post(
  '/categories',
  verifyCsrf,
  body('name').isString().trim().isLength({ min: 1, max: 60 }),
  body('sortOrder').optional().isInt().toInt(),
  validate,
  categoriesController.createCategory
);

router.put(
  '/categories/:slug',
  verifyCsrf,
  param('slug').isString(),
  body('name').optional().isString().trim().isLength({ min: 1, max: 60 }),
  body('sortOrder').optional().isInt().toInt(),
  validate,
  categoriesController.updateCategory
);

router.delete(
  '/categories/:slug',
  verifyCsrf,
  param('slug').isString(),
  validate,
  categoriesController.deleteCategory
);

module.exports = router;
