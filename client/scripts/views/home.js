import { h } from '../utils.js';
import { getViewport } from '../dom.js';
import { api, ApiError } from '../api.js';
import { getState, cacheStoreSnapshot, readStoreSnapshot } from '../state.js';
import { createAppCard, createSkeletonCard } from '../components/appCard.js';
import { showToast } from '../components/toast.js';

function renderHero(app, installedApps) {
  const hero = h('section', { class: 'hero' }, [
    h('div', { class: 'hero__icon' }, [
      app.icon ? h('img', { src: app.icon, alt: '' }) : null,
    ]),
    h('div', {}, [
      h('span', { class: 'badge badge-featured' }, 'Featured'),
      h('h2', { class: 'hero__title mt-2' }, app.name),
      h('p', { class: 'hero__desc' }, app.description || ''),
    ]),
  ]);
  hero.addEventListener('click', () => {
    window.dispatchEvent(new CustomEvent('demonic:navigate', { detail: { path: `/app/${app.id}` } }));
  });
  return hero;
}

function renderSection(title, apps, installedApps, { linkPath } = {}) {
  const grid = h('div', { class: 'app-grid' }, apps.map((app) => createAppCard(app, installedApps)));
  return h('section', { class: 'section' }, [
    h('div', { class: 'section__head' }, [
      h('h2', { class: 'section__title' }, title),
      linkPath ? h('a', { href: linkPath, class: 'section__link' }, 'Alle anzeigen') : null,
    ]),
    grid,
  ]);
}

function renderCategoryChips(categories, activeSlug, onSelect) {
  const row = h('div', { class: 'row chip-row' }, []);
  const chip = (label, slug) => {
    const el = h(
      'button',
      {
        type: 'button',
        class: `btn btn-sm flex-shrink-0 ${slug === activeSlug ? 'btn-install' : 'btn-ghost'}`,
      },
      label
    );
    el.addEventListener('click', () => onSelect(slug));
    return el;
  };
  row.appendChild(chip('Alle', null));
  for (const cat of categories) row.appendChild(chip(cat.name, cat.id));
  return row;
}

export async function renderHome({ signal }) {
  const viewport = getViewport();
  viewport.innerHTML = '';
  const view = h('div', { class: 'view' }, [h('div', { class: 'container' })]);
  viewport.appendChild(view);
  const container = view.firstChild;

  const skeletonGrid = h(
    'div',
    { class: 'app-grid mt-5' },
    Array.from({ length: 10 }, () => createSkeletonCard())
  );
  container.appendChild(skeletonGrid);

  let apps = [];
  let categories = [];
  let offline = false;

  try {
    [apps, categories] = await Promise.all([api.listApps(), api.listCategories()]);
    cacheStoreSnapshot(apps, categories);
  } catch (err) {
    const cached = readStoreSnapshot();
    if (cached) {
      apps = cached.apps;
      categories = cached.categories;
      offline = true;
    } else {
      if (signal.aborted) return;
      container.innerHTML = '';
      container.appendChild(
        h('div', { class: 'empty-state' }, [
          h('h3', {}, 'Demonic App Store nicht erreichbar'),
          h('p', {}, err instanceof ApiError ? err.message : 'Unbekannter Fehler.'),
        ])
      );
      return;
    }
  }

  if (signal.aborted) return;

  const installedApps = await window.nativeBridge.getInstalledApps();
  if (signal.aborted) return;

  if (offline) {
    showToast('Offline-Ansicht: zuletzt geladene Store-Daten werden angezeigt.', { type: 'error' });
  }

  let activeCategory = null;
  let searchTerm = '';

  container.innerHTML = '';

  const chipsHost = h('div', { class: 'pt-4' });
  container.appendChild(chipsHost);

  const sectionsHost = h('div');
  container.appendChild(sectionsHost);

  function applyFilters(list) {
    let result = list;
    if (activeCategory) result = result.filter((a) => a.categorySlug === activeCategory);
    if (searchTerm) {
      const needle = searchTerm.toLowerCase();
      result = result.filter(
        (a) =>
          a.name.toLowerCase().includes(needle) ||
          (a.description || '').toLowerCase().includes(needle) ||
          (a.category || '').toLowerCase().includes(needle)
      );
    }
    return result;
  }

  function renderSections() {
    sectionsHost.innerHTML = '';
    const filtered = applyFilters(apps);

    if (filtered.length === 0) {
      sectionsHost.appendChild(
        h('div', { class: 'empty-state' }, [
          h('h3', {}, 'Keine Apps gefunden'),
          h('p', {}, 'Passe deine Suche oder Kategorie-Auswahl an.'),
        ])
      );
      return;
    }

    const featured = apps.find((a) => a.featured) || null;
    if (featured && !activeCategory && !searchTerm) {
      sectionsHost.appendChild(renderHero(featured, installedApps));
    }

    sectionsHost.appendChild(renderSection('Meine Apps', filtered, installedApps));

    if (!activeCategory && !searchTerm) {
      const updates = [...apps]
        .filter((a) => a.updatedAt)
        .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
        .slice(0, 10);
      if (updates.length) sectionsHost.appendChild(renderSection('Neueste Updates', updates, installedApps));

      const newest = [...apps]
        .filter((a) => a.createdAt)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 10);
      if (newest.length) sectionsHost.appendChild(renderSection('Zuletzt hinzugefügt', newest, installedApps));
    }
  }

  chipsHost.appendChild(
    renderCategoryChips(categories, activeCategory, (slug) => {
      activeCategory = slug;
      renderSections();
    })
  );

  renderSections();

  function onSearch(event) {
    searchTerm = event.detail.term;
    renderSections();
  }
  window.addEventListener('demonic:search', onSearch);
  signal.addEventListener('abort', () => window.removeEventListener('demonic:search', onSearch));
}
