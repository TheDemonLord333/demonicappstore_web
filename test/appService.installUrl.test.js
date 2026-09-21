'use strict';

/**
 * Regressionstests für den Bugfix: Apps mit distributionType "manifest"
 * müssen ihre installUrl automatisch aus der vorhandenen OTA-Manifest-
 * Infrastruktur beziehen (server/utils/manifestUrls.js), statt sich auf ein
 * manuell im Admin-Panel gepflegtes Feld zu verlassen.
 *
 * Nutzt eine eigene, temporäre SQLite-Datei (kein ":memory:", da
 * config/env.js den DB_PATH über path.resolve() auflöst) und läuft dank
 * `node --test` ohne zusätzliche Test-Abhängigkeiten.
 */

const os = require('node:os');
const path = require('node:path');
const fs = require('node:fs');
const { test, after } = require('node:test');
const assert = require('node:assert/strict');

const dbFile = path.join(
  os.tmpdir(),
  `demonic-test-appservice-${process.pid}-${Date.now()}.db`
);
process.env.NODE_ENV = 'test';
process.env.DB_PATH = dbFile;
process.env.BASE_URL = 'https://test.example.com';
process.env.SESSION_SECRET = 'test-secret';

require('../server/database/migrate').run();
const appService = require('../server/services/appService');

after(() => {
  for (const suffix of ['', '-shm', '-wal']) {
    fs.rmSync(dbFile + suffix, { force: true });
  }
});

test('Manifest-App: installUrl wird automatisch erzeugt, wenn Version + IPA vorhanden sind', () => {
  appService.createApp({
    id: 'manifest-app-with-ipa',
    name: 'Manifest App With IPA',
    bundleId: 'com.example.manifestwithipa',
    distributionType: 'manifest',
  });
  const version = appService.addVersion('manifest-app-with-ipa', { version: '1.0.0', build: 1 });
  appService.publishVersion('manifest-app-with-ipa', version.id);
  appService.setVersionIpa('manifest-app-with-ipa', version.id, {
    publicPath: '/uploads/apps/manifest-app-with-ipa/1/manifest-app-with-ipa-1.ipa',
    size: 1234,
  });

  const dto = appService.getAppDetail('manifest-app-with-ipa', { includeAll: true });

  assert.equal(
    dto.installUrl,
    'itms-services://?action=download-manifest&url=' +
      encodeURIComponent('https://test.example.com/api/apps/manifest-app-with-ipa/manifest')
  );
  assert.equal(dto.manifestUrl, 'https://test.example.com/api/apps/manifest-app-with-ipa/manifest');
});

test('Manifest-App: installUrl bleibt leer, wenn die veröffentlichte Version keine IPA hat', () => {
  appService.createApp({
    id: 'manifest-app-no-ipa',
    name: 'Manifest App No IPA',
    bundleId: 'com.example.manifestnoipa',
    distributionType: 'manifest',
  });
  const version = appService.addVersion('manifest-app-no-ipa', { version: '1.0.0', build: 1 });
  appService.publishVersion('manifest-app-no-ipa', version.id);

  const dto = appService.getAppDetail('manifest-app-no-ipa', { includeAll: true });

  assert.equal(dto.installUrl, null);
  assert.equal(dto.version, '1.0.0');
});

test('Manifest-App: installUrl und version sind leer, solange keine Version veröffentlicht ist', () => {
  appService.createApp({
    id: 'manifest-app-no-version',
    name: 'Manifest App No Version',
    bundleId: 'com.example.manifestnoversion',
    distributionType: 'manifest',
  });

  const dto = appService.getAppDetail('manifest-app-no-version', { includeAll: true });

  assert.equal(dto.installUrl, null);
  assert.equal(dto.version, null);
});

test('Direkte/externe Distribution: manuell gepflegte installUrl bleibt unverändert erhalten', () => {
  appService.createApp({
    id: 'external-app',
    name: 'External App',
    bundleId: 'com.example.external',
    distributionType: 'external',
    installUrl: 'https://example.com/manual-install-link',
  });

  const dto = appService.getAppDetail('external-app', { includeAll: true });

  assert.equal(dto.installUrl, 'https://example.com/manual-install-link');
  assert.equal(dto.distributionType, 'external');
});
