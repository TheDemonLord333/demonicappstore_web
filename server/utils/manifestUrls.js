'use strict';

const config = require('../config/env');

/**
 * Kleine, abhängigkeitsfreie URL-Hilfsfunktionen rund um das iOS-OTA-Manifest.
 *
 * Bewusst ausgelagert aus manifestService.js: appService.js muss die
 * itms-services-Install-URL für Apps mit distributionType "manifest"
 * automatisch berechnen können (siehe toPublicDto()), darf dafür aber NICHT
 * manifestService.js importieren, da manifestService.js bereits appService.js
 * importiert (Zugriff auf App-/Versionsdaten für das Manifest-XML). Dieses
 * Modul hat keinerlei Abhängigkeit auf appService/manifestService und kann
 * daher gefahrlos von beiden Seiten verwendet werden.
 */

function buildManifestUrl(appSlug) {
  return `${config.baseUrl}/api/apps/${appSlug}/manifest`;
}

/**
 * itms-services://-Link, den iOS Safari bzw. eine WKWebView zum Start der
 * OTA-Installation öffnen kann (Standard-Apple-Mechanismus für signierte
 * Ad-hoc-/In-House-IPAs, siehe manifestService.buildManifestPlist).
 */
function buildInstallLink(appSlug) {
  const manifestUrl = buildManifestUrl(appSlug);
  return `itms-services://?action=download-manifest&url=${encodeURIComponent(manifestUrl)}`;
}

module.exports = { buildManifestUrl, buildInstallLink };
