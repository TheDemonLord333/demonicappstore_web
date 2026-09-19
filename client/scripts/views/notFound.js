import { h } from '../utils.js';
import { getViewport } from '../dom.js';

export async function renderNotFound() {
  const viewport = getViewport();
  viewport.innerHTML = '';
  viewport.appendChild(
    h('div', { class: 'view' }, [
      h('div', { class: 'container' }, [
        h('div', { class: 'empty-state notfound-spacer' }, [
          h('h3', {}, 'Seite nicht gefunden'),
          h('a', { href: '/', class: 'btn btn-ghost mt-4' }, 'Zurück zum Store'),
        ]),
      ]),
    ])
  );
}
