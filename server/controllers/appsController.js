'use strict';

const appService = require('../services/appService');
const manifestService = require('../services/manifestService');
const asyncHandler = require('../utils/asyncHandler');

const listApps = asyncHandler(async (req, res) => {
  const { category, q } = req.query;
  let apps = appService.listApps({ includeAll: false });

  if (category) {
    apps = apps.filter((a) => a.categorySlug === category);
  }
  if (q) {
    const needle = String(q).toLowerCase();
    apps = apps.filter(
      (a) =>
        a.name.toLowerCase().includes(needle) ||
        (a.description || '').toLowerCase().includes(needle) ||
        (a.category || '').toLowerCase().includes(needle)
    );
  }

  res.json(apps);
});

const getApp = asyncHandler(async (req, res) => {
  const app = appService.getAppDetail(req.params.id, { includeAll: false });
  res.json(app);
});

const getAppVersions = asyncHandler(async (req, res) => {
  const versions = appService.listVersions(req.params.id);
  res.json(versions);
});

const getManifest = asyncHandler(async (req, res) => {
  const plist = manifestService.buildManifestPlist(req.params.id);
  res.set('Content-Type', 'application/xml; charset=utf-8');
  res.send(plist);
});

module.exports = { listApps, getApp, getAppVersions, getManifest };
