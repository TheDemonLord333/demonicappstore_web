(function () {
  'use strict';

  var btn = document.getElementById('retry-btn');
  if (btn) {
    btn.addEventListener('click', function () {
      window.location.reload();
    });
  }

  window.addEventListener('online', function () {
    window.location.reload();
  });
})();
