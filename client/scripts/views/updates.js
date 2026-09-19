import { h, formatDate } from '../utils.js';
import { getViewport } from '../dom.js';
import { api, ApiError } from '../api.js';
import { createAppCard, createSkeletonCard } from '../components/appCard.js';

export async function renderUpdates({ signal }) {
  const viewport = getViewport();
  viewport.innerHTML = '';
  const view = h('div', { class: 'view' }, [
    h('div', { class: 'container' }, [
      h('div', { class: 'section__head pt-5' }, [h('h1', { class: 'section__title' }, 'Updates')]),
      h('div', { class: 'app-grid' }, Array.from({ length: 6 }, () => createSkeletonCard())),
    ]),
  ]);
  viewport.appendChild(view);
  const container = view.querySelector('.container');

  let apps = [];
  try {
    apps = await api.listApps();
  } catch (err) {
    if (signal.aborted) return;
    container.innerHTML = '';
    container.appendChild(
      h('div', { class: 'empty-state' }, [
        h('h3', {}, 'Nicht erreichbar'),
        h('p', {}, err instanceof ApiError ? err.message : 'Unbekannter Fehler.'),
      ])
    );
    return;
  }

  if (signal.aborted) return;
  const installedApps = await window.nativeBridge.getInstalledApps();
  if (signal.aborted) return;

  const withUpdates = apps.filter((a) => window.nativeBridge.resolveAppState(a, installedApps) === 'update');
  const recent = [...apps].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

  container.innerHTML = '';
  container.appendChild(h('div', { class: 'section__head pt-5' }, [h('h1', { class: 'section__title' }, 'Updates')]));

  if (withUpdates.length > 0) {
    container.appendChild(
      h('div', { class: 'app-grid' }, withUpdates.map((a) => createAppCard(a, installedApps)))
    );
  } else {
    container.appendChild(
      h('div', { class: 'empty-state' }, [
        h('h3', {}, 'Alles aktuell'),
        h('p', {}, 'Für deine installierten Apps sind derzeit keine Updates verfügbar.'),
      ])
    );
  }

  container.appendChild(
    h('div', { class: 'section__head mt-6' }, [h('h2', { class: 'section__title' }, 'Zuletzt aktualisiert')])
  );
  container.appendChild(
    h(
      'div',
      { class: 'version-list' },
      recent.slice(0, 8).map((a) =>
        h('div', { class: 'version-row' }, [
          h('div', {}, [h('div', { class: 'version-row__num' }, a.name), h('div', { class: 'version-row__notes' }, `Version ${a.version || '–'}`)]),
          h('span', { class: 'app-card__version' }, formatDate(a.updatedAt)),
        ])
      )
    )
  );
}
