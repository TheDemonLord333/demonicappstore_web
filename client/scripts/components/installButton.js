import { h } from '../utils.js';
import { showToast } from './toast.js';

const LABELS = {
  install: 'Installieren',
  update: 'Update',
  open: 'Öffnen',
  unavailable: 'Nicht verfügbar',
};

const CLASSES = {
  install: 'btn-install',
  update: 'btn-update',
  open: 'btn-open',
  unavailable: 'btn-unavailable',
};

export function createInstallButton(app, installedApps, { size = 'normal' } = {}) {
  const state = window.nativeBridge.resolveAppState(app, installedApps);

  const btn = h(
    'button',
    {
      class: `btn ${CLASSES[state]}${size === 'sm' ? ' btn-sm' : ''}`,
      type: 'button',
      disabled: state === 'unavailable',
      'aria-label': `${LABELS[state]} – ${app.name}`,
    },
    LABELS[state]
  );

  if (state === 'unavailable') return btn;

  btn.addEventListener('click', async (event) => {
    event.stopPropagation();
    event.preventDefault();
    if (btn.classList.contains('is-loading')) return;

    btn.classList.add('is-loading');
    try {
      if (state === 'open') {
        await window.nativeBridge.openApp(app);
      } else {
        await window.nativeBridge.installApp(app);
      }
      btn.classList.remove('is-loading');
      btn.classList.add('just-succeeded');
      setTimeout(() => btn.classList.remove('just-succeeded'), 300);
    } catch (err) {
      btn.classList.remove('is-loading');
      showToast(err.message || 'Aktion fehlgeschlagen.', { type: 'error' });
    }
  });

  return btn;
}
