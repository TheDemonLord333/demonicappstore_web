import { h } from '../utils.js';
import { getViewport } from '../dom.js';
import { api } from '../api.js';
import { setState } from '../state.js';
import { navigateTo } from '../router.js';

const NAV = [
  { path: '/admin', label: 'Apps' },
  { path: '/admin/categories', label: 'Kategorien' },
];

export function renderAdminLayout(activePath) {
  const viewport = getViewport();
  viewport.innerHTML = '';

  const logoutBtn = h('button', { class: 'btn btn-ghost btn-sm', type: 'button' }, 'Abmelden');
  logoutBtn.addEventListener('click', async () => {
    try {
      await api.logout();
    } catch {
      /* Logout best-effort */
    }
    setState({ user: null });
    navigateTo('/admin');
  });

  const navLinks = (className) =>
    NAV.map((item) =>
      h(
        'a',
        { href: item.path, class: `${className}${item.path === activePath ? ' is-active' : ''}` },
        item.label
      )
    );

  const topbar = h('div', { class: 'admin-header-bar' }, [
    h('div', { class: 'admin-header-bar__inner' }, [
      h('a', { href: '/', class: 'brand mr-auto' }, [
        h('span', { class: 'brand__text' }, [h('span', {}, 'DEMONIC'), h('span', {}, 'ADMIN')]),
      ]),
      logoutBtn,
    ]),
  ]);

  const mobileTabs = h('div', { class: 'admin-mobile-tabs' }, navLinks(''));

  const sidebar = h('aside', { class: 'admin-sidebar' }, [
    h('nav', {}, navLinks('admin-nav__link')),
  ]);

  const main = h('main', { class: 'admin-main' });

  viewport.appendChild(
    h('div', { class: 'view view--flush' }, [
      topbar,
      mobileTabs,
      h('div', { class: 'admin-shell' }, [sidebar, main]),
    ])
  );

  return main;
}
