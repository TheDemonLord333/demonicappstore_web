import { h, formatDate, escapeHtml } from '../utils.js';
import { getViewport } from '../dom.js';
import { api, ApiError } from '../api.js';
import { createInstallButton } from '../components/installButton.js';

export async function renderAppDetail({ params, signal }) {
  const viewport = getViewport();
  viewport.innerHTML = '';
  const view = h('div', { class: 'view' }, [h('div', { class: 'container' }, [h('p', {}, 'Lädt…')])]);
  viewport.appendChild(view);
  const container = view.firstChild;

  let app;
  try {
    app = await api.getApp(params.id);
  } catch (err) {
    if (signal.aborted) return;
    container.innerHTML = '';
    container.appendChild(
      h('div', { class: 'empty-state' }, [
        h('h3', {}, 'App nicht gefunden'),
        h('p', {}, err instanceof ApiError ? err.message : 'Unbekannter Fehler.'),
        h('a', { href: '/', class: 'btn btn-ghost mt-4' }, 'Zurück zum Store'),
      ])
    );
    return;
  }

  if (signal.aborted) return;
  const installedApps = await window.nativeBridge.getInstalledApps();
  if (signal.aborted) return;

  container.innerHTML = '';

  const installBtn = createInstallButton(app, installedApps);

  const header = h('div', { class: 'detail-header' }, [
    h('div', { class: 'detail-icon' }, [
      app.icon ? h('img', { src: app.icon, alt: '' }) : null,
    ]),
    h('div', { class: 'flex-1 min-w-0' }, [
      h('h1', { class: 'detail-title' }, app.name),
      h('p', { class: 'detail-sub' }, `${app.category || 'App'} · Version ${app.version || '–'}${app.build ? ` (${app.build})` : ''}`),
      h('div', { class: 'detail-actions' }, [installBtn]),
    ]),
  ]);
  container.appendChild(header);

  if (app.description) {
    container.appendChild(
      h('section', { class: 'detail-section' }, [
        h('h2', { class: 'detail-section__title' }, 'Beschreibung'),
        h('p', { class: 'detail-description' }, app.description),
      ])
    );
  }

  if (app.screenshots && app.screenshots.length) {
    container.appendChild(
      h('section', { class: 'detail-section' }, [
        h('h2', { class: 'detail-section__title' }, 'Screenshots'),
        h(
          'div',
          { class: 'screenshot-strip' },
          app.screenshots.map((src) => h('img', { src, alt: '', loading: 'lazy' }))
        ),
      ])
    );
  }

  if (app.releaseNotes) {
    container.appendChild(
      h('section', { class: 'detail-section' }, [
        h('h2', { class: 'detail-section__title' }, `Was ist neu in Version ${app.version}`),
        h('p', { class: 'detail-description' }, app.releaseNotes),
      ])
    );
  }

  if (app.versions && app.versions.length > 1) {
    container.appendChild(
      h('section', { class: 'detail-section' }, [
        h('h2', { class: 'detail-section__title' }, 'Versionsverlauf'),
        h(
          'div',
          { class: 'version-list' },
          app.versions.map((v) =>
            h('div', { class: 'version-row' }, [
              h('div', {}, [
                h('div', { class: 'version-row__num' }, [
                  `${v.version}`,
                  v.isCurrent ? h('span', { class: 'badge badge-violet ml-2' }, 'Aktuell') : null,
                ]),
                v.releaseNotes ? h('div', { class: 'version-row__notes' }, v.releaseNotes) : null,
              ]),
              h('span', { class: 'app-card__version' }, formatDate(v.createdAt)),
            ])
          )
        ),
      ])
    );
  }

  container.appendChild(
    h('section', { class: 'detail-section' }, [
      h('h2', { class: 'detail-section__title' }, 'Technische Informationen'),
      h('dl', { class: 'info-table' }, [
        h('dt', {}, 'Bundle ID'),
        h('dd', {}, app.bundleId),
        h('dt', {}, 'Version'),
        h('dd', {}, app.version || '–'),
        h('dt', {}, 'Build'),
        h('dd', {}, app.build ? String(app.build) : '–'),
        h('dt', {}, 'Letztes Update'),
        h('dd', {}, formatDate(app.updatedAt)),
      ]),
    ])
  );
}
