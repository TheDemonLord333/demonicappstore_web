'use strict';

/**
 * Regressionstests für das bestehende OTA-Manifest-System
 * (server/services/manifestService.js). Stellt sicher, dass der Bugfix an
 * appService.js keine zwei konkurrierenden Manifest-Implementierungen
 * eingeführt hat und die vorhandene Fehlerbehandlung verständliche
 * Meldungen liefert.
 */

const os = require('node:os');
const path = require('node:path');
const fs = require('node:fs');
const { test, after } = require('node:test');
const assert = require('node:assert/strict');

const dbFile = path.join(
  os.tmpdir(),
  `demonic-test-manifestservice-${process.pid}-${Date.now()}.db`
);
process.env.NODE_ENV = 'test';
process.env.DB_PATH = dbFile;
process.env.BASE_URL = 'https://test.example.com';
process.env.SESSION_SECRET = 'test-secret';

require('../server/database/migrate').run();
const appService = require('../server/services/appService');
const manifestService = require('../server/services/manifestService');

after(() => {
  for (const suffix of ['', '-shm', '-wal']) {
    fs.rmSync(dbFile + suffix, { force: true });
  }
});

test('buildInstallLink() erzeugt einen gültigen itms-services-Link aus BASE_URL', () => {
  const link = manifestService.buildInstallLink('demo-app');
  assert.equal(
    link,
    'itms-services://?action=download-manifest&url=' +
      encodeURIComponent('https://test.example.com/api/apps/demo-app/manifest')
  );
});

test('buildManifestPlist() wirft eine verständliche Fehlermeldung ohne veröffentlichte Version', () => {
  appService.createApp({
    id: 'plist-app-no-version',
    name: 'Plist App',
    bundleId: 'com.example.plistapp',
    distributionType: 'manifest',
  });

  assert.throws(
    () => manifestService.buildManifestPlist('plist-app-no-version'),
    (err) => {
      assert.equal(err.status, 404);
      assert.match(err.message, /keine installierbare Version/);
      return true;
    }
  );
});

test('buildManifestPlist() wirft dieselbe verständliche Fehlermeldung, wenn eine Version ohne IPA existiert', () => {
  appService.createApp({
    id: 'plist-app-no-ipa',
    name: 'Plist App No IPA',
    bundleId: 'com.example.plistnoipa',
    distributionType: 'manifest',
  });
  const version = appService.addVersion('plist-app-no-ipa', { version: '1.0.0', build: 1 });
  appService.publishVersion('plist-app-no-ipa', version.id);

  assert.throws(
    () => manifestService.buildManifestPlist('plist-app-no-ipa'),
    (err) => {
      assert.equal(err.status, 404);
      assert.match(err.message, /keine installierbare Version/);
      return true;
    }
  );
});

test('buildManifestPlist() liefert ein plist mit Bundle-, Versions- und IPA-Daten der aktuellen Version', () => {
  appService.createApp({
    id: 'plist-app-ready',
    name: 'Plist App Ready',
    bundleId: 'com.example.plistready',
    distributionType: 'manifest',
  });
  const version = appService.addVersion('plist-app-ready', { version: '2.0.0', build: 5 });
  appService.publishVersion('plist-app-ready', version.id);
  appService.setVersionIpa('plist-app-ready', version.id, {
    publicPath: '/uploads/apps/plist-app-ready/2/plist-app-ready-2.ipa',
    size: 42,
  });

  const plist = manifestService.buildManifestPlist('plist-app-ready');

  assert.match(plist, /<string>com\.example\.plistready<\/string>/);
  assert.match(plist, /<string>2\.0\.0<\/string>/);
  assert.match(plist, /software-package/);
  assert.match(
    plist,
    /https:\/\/test\.example\.com\/uploads\/apps\/plist-app-ready\/2\/plist-app-ready-2\.ipa/
  );
});

test('buildManifestPlist() für eine unbekannte App liefert 404', () => {
  assert.throws(
    () => manifestService.buildManifestPlist('does-not-exist'),
    (err) => {
      assert.equal(err.status, 404);
      return true;
    }
  );
});
