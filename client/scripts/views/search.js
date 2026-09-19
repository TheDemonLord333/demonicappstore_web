import { h, debounce } from '../utils.js';
import { getViewport } from '../dom.js';
import { api } from '../api.js';
import { createAppCard } from '../components/appCard.js';

export async function renderSearch({ signal }) {
  const viewport = getViewport();
  viewport.innerHTML = '';

  const input = h('input', {
    class: 'input',
    type: 'search',
    placeholder: 'Nach Apps, Kategorien suchen…',
    autofocus: true,
  });

  let resultsHost = h('div', { class: 'app-grid mt-5' });

  const view = h('div', { class: 'view' }, [
    h('div', { class: 'container' }, [
      h('div', { class: 'pt-5' }, [input]),
      resultsHost,
    ]),
  ]);
  viewport.appendChild(view);

  let apps = [];
  try {
    apps = await api.listApps();
  } catch {
    apps = [];
  }
  if (signal.aborted) return;
  const installedApps = await window.nativeBridge.getInstalledApps();
  if (signal.aborted) return;

  function renderResults(term) {
    resultsHost.innerHTML = '';
    if (!term) return;
    const needle = term.toLowerCase();
    const matches = apps.filter(
      (a) =>
        a.name.toLowerCase().includes(needle) ||
        (a.description || '').toLowerCase().includes(needle) ||
        (a.category || '').toLowerCase().includes(needle)
    );
    if (matches.length === 0) {
      resultsHost.replaceWith(
        (resultsHost = h('div', { class: 'empty-state' }, [h('p', {}, `Keine Treffer für „${term}“.`)]))
      );
      return;
    }
    for (const app of matches) resultsHost.appendChild(createAppCard(app, installedApps));
  }

  input.addEventListener('input', debounce(() => renderResults(input.value.trim()), 150));
  setTimeout(() => input.focus(), 50);
}
