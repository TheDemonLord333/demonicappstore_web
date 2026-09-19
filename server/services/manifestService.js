'use strict';

const config = require('../config/env');
const appService = require('./appService');

function xmlEscape(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function absoluteUrl(pathOrUrl) {
  if (!pathOrUrl) return null;
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return `${config.baseUrl}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`;
}

/**
 * Erzeugt ein iOS OTA-Installations-Manifest (itms-services Format) dynamisch
 * aus den in der Datenbank hinterlegten App-/Versionsdaten. Dies ist der von
 * Apple für Ad-hoc-/In-House-Verteilung vorgesehene, offizielle Mechanismus –
 * es werden keinerlei Signaturen erzeugt oder Sicherheitsmechanismen umgangen.
 * Voraussetzung ist stets eine bereits von Apple/dem Entwickler ordnungsgemäß
 * signierte IPA-Datei.
 */
function buildManifestPlist(appSlug) {
  const app = appService.requireAppRow(appSlug);
  const version = appService.getCurrentVersionRow(app.id);

  if (!version || !version.ipa_path) {
    const err = new Error('Für diese App ist derzeit keine installierbare Version verfügbar.');
    err.status = 404;
    throw err;
  }

  const ipaUrl = absoluteUrl(version.ipa_path);
  const iconUrl = absoluteUrl(app.icon_path);

  const assets = [
    `      <dict>
        <key>kind</key>
        <string>software-package</string>
        <key>url</key>
        <string>${xmlEscape(ipaUrl)}</string>
      </dict>`,
  ];

  if (iconUrl) {
    assets.push(
      `      <dict>
        <key>kind</key>
        <string>display-image</string>
        <key>url</key>
        <string>${xmlEscape(iconUrl)}</string>
      </dict>`,
      `      <dict>
        <key>kind</key>
        <string>full-size-image</string>
        <key>url</key>
        <string>${xmlEscape(iconUrl)}</string>
      </dict>`
    );
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>items</key>
  <array>
    <dict>
      <key>assets</key>
      <array>
${assets.join('\n')}
      </array>
      <key>metadata</key>
      <dict>
        <key>bundle-identifier</key>
        <string>${xmlEscape(app.bundle_id)}</string>
        <key>bundle-version</key>
        <string>${xmlEscape(version.version)}</string>
        <key>kind</key>
        <string>software</string>
        <key>title</key>
        <string>${xmlEscape(app.name)}</string>
      </dict>
    </dict>
  </array>
</dict>
</plist>
`;
}

/**
 * itms-services://-Link, den das Frontend zum Starten der OTA-Installation
 * öffnen kann (Standard-Apple-Mechanismus für signierte Ad-hoc-/In-House-IPAs).
 */
function buildInstallLink(appSlug) {
  const manifestUrl = `${config.baseUrl}/api/apps/${appSlug}/manifest`;
  return `itms-services://?action=download-manifest&url=${encodeURIComponent(manifestUrl)}`;
}

module.exports = { buildManifestPlist, buildInstallLink };
