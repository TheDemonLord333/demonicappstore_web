'use strict';

// Vermeidet try/catch-Boilerplate in jedem Controller und leitet Fehler
// zuverlässig an den zentralen Error-Handler weiter.
module.exports = function asyncHandler(fn) {
  return function wrapped(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
