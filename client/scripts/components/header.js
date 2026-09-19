import { h, debounce } from '../utils.js';
import { getState } from '../state.js';

const NAV_ITEMS = [
  { path: '/', label: 'Store' },
  { path: '/updates', label: 'Updates' },
];

function brandMark() {
  return h('img', {
    class: 'brand__mark',
    src: '/icons/icon-192.png',
    alt: '',
    width: '30',
    height: '30',
  });
}

export function renderHeader(container, { onSearch } = {}) {
  container.innerHTML = '';

  const nav = h(
    'nav',
    { class: 'main-nav' },
    NAV_ITEMS.map((item) =>
      h(
        'a',
        {
          href: item.path,
          class: `main-nav__link${window.location.pathname === item.path ? ' is-active' : ''}`,
        },
        item.label
      )
    )
  );

  const searchInput = h('input', {
    type: 'search',
    placeholder: 'Apps durchsuchen…',
    'aria-label': 'Store durchsuchen',
  });

  const searchBox = h('div', { class: 'search-box' }, [
    h(
      'svg',
      { class: 'search-box__icon', width: '16', height: '16', viewBox: '0 0 24 24', fill: 'none' },
      [
        h('circle', { cx: '11', cy: '11', r: '7', stroke: 'currentColor', 'stroke-width': '2' }),
        h('line', {
          x1: '21',
          y1: '21',
          x2: '16.65',
          y2: '16.65',
          stroke: 'currentColor',
          'stroke-width': '2',
          'stroke-linecap': 'round',
        }),
      ]
    ),
    searchInput,
  ]);

  searchInput.addEventListener('focus', () => searchBox.classList.add('is-expanded'));
  searchInput.addEventListener('blur', () => {
    if (!searchInput.value) searchBox.classList.remove('is-expanded');
  });
  searchInput.addEventListener(
    'input',
    debounce(() => onSearch && onSearch(searchInput.value.trim()), 200)
  );

  const state = getState();
  const accountLink = h(
    'a',
    { href: '/admin', class: 'icon-btn', 'aria-label': state.user ? 'Admin-Bereich' : 'Anmelden' },
    [
      h('svg', { width: '18', height: '18', viewBox: '0 0 24 24', fill: 'none' }, [
        h('circle', { cx: '12', cy: '8', r: '4', stroke: 'currentColor', 'stroke-width': '2' }),
        h('path', {
          d: 'M4 20c0-4 4-6 8-6s8 2 8 6',
          stroke: 'currentColor',
          'stroke-width': '2',
          'stroke-linecap': 'round',
        }),
      ]),
    ]
  );

  const header = h('header', { class: 'site-header' }, [
    h('div', { class: 'site-header__inner' }, [
      h('a', { href: '/', class: 'brand' }, [
        brandMark(),
        h('span', { class: 'brand__text' }, [h('span', {}, 'DEMONIC'), h('span', {}, 'APP STORE')]),
      ]),
      nav,
      h('div', { class: 'header-spacer' }),
      h('div', { class: 'header-actions' }, [searchBox, accountLink]),
    ]),
  ]);

  container.appendChild(header);
  return { searchInput };
}

export function renderTabBar(container) {
  const items = [
    { path: '/', label: 'Store', icon: 'M4 10l8-6 8 6v9a1 1 0 01-1 1h-4v-6H9v6H5a1 1 0 01-1-1z' },
    { path: '/search', label: 'Suche', icon: 'M11 4a7 7 0 105.29 12.29l3.7 3.7 1.42-1.42-3.7-3.7A7 7 0 0011 4z' },
    { path: '/updates', label: 'Updates', icon: 'M12 4v10m0 0l-4-4m4 4l4-4M5 18h14' },
  ];

  container.innerHTML = '';
  container.className = 'tab-bar';

  for (const item of items) {
    const active = window.location.pathname === item.path;
    container.appendChild(
      h('a', { href: item.path, class: `tab-bar__item${active ? ' is-active' : ''}` }, [
        h('svg', { width: '22', height: '22', viewBox: '0 0 24 24', fill: 'none' }, [
          h('path', {
            d: item.icon,
            stroke: 'currentColor',
            'stroke-width': '2',
            'stroke-linecap': 'round',
            'stroke-linejoin': 'round',
          }),
        ]),
        item.label,
      ])
    );
  }
}
