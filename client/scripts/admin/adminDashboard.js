import { h } from '../utils.js';
import { api, ApiError } from '../api.js';
import { renderAdminLayout } from './adminLayout.js';
import { showToast } from '../components/toast.js';

export async function renderAdminDashboard() {
  const main = renderAdminLayout('/admin');

  main.appendChild(
    h('div', { class: 'admin-topbar' }, [
      h('h1', { class: 'section__title' }, 'Apps verwalten'),
      h('a', { href: '/admin/apps/new', class: 'btn btn-install' }, '+ Neue App'),
    ])
  );

  const tableHost = h('div', {}, [h('p', {}, 'Lädt…')]);
  main.appendChild(tableHost);

  let apps;
  try {
    apps = await api.adminListApps();
  } catch (err) {
    tableHost.innerHTML = '';
    tableHost.appendChild(
      h('div', { class: 'empty-state' }, [h('p', {}, err instanceof ApiError ? err.message : 'Fehler beim Laden.')])
    );
    return;
  }

  function renderTable() {
    tableHost.innerHTML = '';

    if (apps.length === 0) {
      tableHost.appendChild(
        h('div', { class: 'empty-state' }, [
          h('h3', {}, 'Noch keine Apps'),
          h('p', {}, 'Lege deine erste App an, um loszulegen.'),
        ])
      );
      return;
    }

    const rows = apps.map((app) => {
      const deleteBtn = h('button', { class: 'btn btn-sm btn-danger', type: 'button' }, 'Löschen');
      deleteBtn.addEventListener('click', async () => {
        if (!window.confirm(`"${app.name}" wirklich unwiderruflich löschen?`)) return;
        try {
          await api.adminDeleteApp(app.id);
          apps = apps.filter((a) => a.id !== app.id);
          renderTable();
          showToast(`${app.name} wurde gelöscht.`, { type: 'success' });
        } catch (err) {
          showToast(err instanceof ApiError ? err.message : 'Löschen fehlgeschlagen.', { type: 'error' });
        }
      });

      return h('tr', {}, [
        h('td', {}, [
          h('div', { class: 'row' }, [
            app.icon
              ? h('img', { class: 'table-icon', src: app.icon, alt: '' })
              : h('div', { class: 'table-icon' }),
            h('div', {}, [
              h('div', { class: 'font-bold' }, app.name),
              h('div', { class: 'text-muted text-xs' }, app.bundleId),
            ]),
          ]),
        ]),
        h('td', {}, app.category || '–'),
        h('td', {}, app.version || '–'),
        h('td', {}, [h('span', { class: `status-pill ${app.status}` }, app.status)]),
        h('td', {}, [
          h('div', { class: 'row' }, [
            h('a', { href: `/admin/apps/${app.id}`, class: 'btn btn-sm btn-ghost' }, 'Bearbeiten'),
            deleteBtn,
          ]),
        ]),
      ]);
    });

    tableHost.appendChild(
      h('div', { class: 'table-wrap' }, [
        h('table', { class: 'table' }, [
          h('thead', {}, [
            h('tr', {}, [
              h('th', {}, 'App'),
              h('th', {}, 'Kategorie'),
              h('th', {}, 'Version'),
              h('th', {}, 'Status'),
              h('th', {}, 'Aktionen'),
            ]),
          ]),
          h('tbody', {}, rows),
        ]),
      ])
    );
  }

  renderTable();
}
