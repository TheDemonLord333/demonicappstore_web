import { h, escapeHtml } from '../utils.js';
import { createInstallButton } from './installButton.js';

export function createAppCard(app, installedApps) {
  const iconWrap = h('div', { class: 'app-card__icon-wrap' }, [
    app.icon
      ? h('img', { src: app.icon, alt: '', loading: 'lazy' })
      : h('span', { class: 'app-card__icon-fallback' }, escapeHtml(app.name[0] || '?')),
  ]);

  const card = h(
    'article',
    { class: 'app-card', role: 'link', tabindex: '0', 'aria-label': app.name },
    [
      iconWrap,
      h('div', { class: 'app-card__body' }, [
        h('h3', { class: 'app-card__name' }, app.name),
        h('p', { class: 'app-card__meta' }, app.category || 'App'),
      ]),
      h('div', { class: 'app-card__footer' }, [
        h('span', { class: 'app-card__version' }, app.version ? `v${app.version}` : ''),
        createInstallButton(app, installedApps, { size: 'sm' }),
      ]),
    ]
  );

  function open() {
    window.dispatchEvent(new CustomEvent('demonic:navigate', { detail: { path: `/app/${app.id}` } }));
  }
  card.addEventListener('click', open);
  card.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      open();
    }
  });

  return card;
}

export function createSkeletonCard() {
  return h('div', { class: 'app-card skeleton-card skeleton', 'aria-hidden': 'true' });
}
