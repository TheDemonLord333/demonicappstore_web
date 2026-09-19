'use strict';

const fs = require('fs');
const appService = require('../services/appService');
const uploadService = require('../services/uploadService');
const asyncHandler = require('../utils/asyncHandler');

const listApps = asyncHandler(async (req, res) => {
  res.json(appService.listApps({ includeAll: true }));
});

const getApp = asyncHandler(async (req, res) => {
  res.json(appService.getAppDetail(req.params.id, { includeAll: true }));
});

const createApp = asyncHandler(async (req, res) => {
  const app = appService.createApp(req.body);
  res.status(201).json(app);
});

const updateApp = asyncHandler(async (req, res) => {
  const app = appService.updateApp(req.params.id, req.body);
  res.json(app);
});

const deleteApp = asyncHandler(async (req, res) => {
  appService.deleteApp(req.params.id);
  res.status(204).send();
});

const uploadIcon = asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Keine Datei erhalten.' });
  const publicPath = uploadService.toPublicPath(req.file.path);
  const app = appService.setAppIcon(req.params.id, publicPath);
  res.json(app);
});

const uploadScreenshots = asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'Keine Dateien erhalten.' });
  }
  let app;
  for (const file of req.files) {
    const publicPath = uploadService.toPublicPath(file.path);
    app = appService.addScreenshot(req.params.id, publicPath);
  }
  res.json(app);
});

const deleteScreenshot = asyncHandler(async (req, res) => {
  const app = appService.removeScreenshot(req.params.id, req.params.screenshotId);
  res.json(app);
});

const addVersion = asyncHandler(async (req, res) => {
  const { version, build, releaseNotes } = req.body;
  const created = appService.addVersion(req.params.id, {
    version,
    build: parseInt(build, 10),
    releaseNotes,
  });
  res.status(201).json(appService.toVersionDto(created));
});

const updateVersion = asyncHandler(async (req, res) => {
  const { build, releaseNotes } = req.body;
  const updated = appService.updateVersion(req.params.id, req.params.versionId, {
    build: parseInt(build, 10),
    releaseNotes,
  });
  res.json(appService.toVersionDto(updated));
});

const deleteVersion = asyncHandler(async (req, res) => {
  appService.deleteVersion(req.params.id, req.params.versionId);
  res.status(204).send();
});

const publishVersion = asyncHandler(async (req, res) => {
  const app = appService.publishVersion(req.params.id, req.params.versionId);
  res.json(app);
});

const uploadIpa = asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Keine Datei erhalten.' });

  if (!uploadService.isLikelyZip(req.file.path)) {
    fs.rmSync(req.file.path, { force: true });
    return res.status(400).json({ error: 'Die Datei ist keine gültige IPA-Datei.' });
  }

  const publicPath = uploadService.toPublicPath(req.file.path);
  const updated = appService.setVersionIpa(req.params.id, req.params.versionId, {
    publicPath,
    size: req.file.size,
  });
  res.json(appService.toVersionDto(updated));
});

module.exports = {
  listApps,
  getApp,
  createApp,
  updateApp,
  deleteApp,
  uploadIcon,
  uploadScreenshots,
  deleteScreenshot,
  addVersion,
  updateVersion,
  deleteVersion,
  publishVersion,
  uploadIpa,
};
