'use strict';

const path = require('path');

/**
 * Löst segments relativ zu baseDir auf und stellt sicher, dass das Ergebnis
 * garantiert innerhalb von baseDir liegt (Schutz vor Path-Traversal via
 * "..", absoluten Pfaden etc.). Wirft bei Verstoß einen Fehler.
 */
function safeJoin(baseDir, ...segments) {
  const resolvedBase = path.resolve(baseDir);
  const resolvedTarget = path.resolve(resolvedBase, ...segments);

  if (resolvedTarget !== resolvedBase && !resolvedTarget.startsWith(resolvedBase + path.sep)) {
    throw new Error('Unsicherer Pfad erkannt.');
  }
  return resolvedTarget;
}

module.exports = { safeJoin };
