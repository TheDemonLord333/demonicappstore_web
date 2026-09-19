import { h } from '../utils.js';
import { api, ApiError } from '../api.js';
import { renderAdminLayout } from './adminLayout.js';
import { showToast } from '../components/toast.js';

export async function renderAdminCategories() {
  const main = renderAdminLayout('/admin/categories');

  main.appendChild(h('h1', { class: 'section__title mb-4' }, 'Kategorien'));

  const nameInput = h('input', { class: 'input', placeholder: 'Name (z. B. Games)' });
  const addBtn = h('button', { class: 'btn btn-install', type: 'submit' }, 'Hinzufügen');
  const form = h('form', { class: 'row items-end mb-5' }, [
    h('div', { class: 'field flex-1' }, [h('label', {}, 'Neue Kategorie'), nameInput]),
    addBtn,
  ]);

  const listHost = h('div', { class: 'stack' });

  main.appendChild(h('div', { class: 'panel' }, [form, listHost]));

  let categories;
  try {
    categories = await api.adminListCategories();
  } catch (err) {
    listHost.appendChild(h('p', {}, err instanceof ApiError ? err.message : 'Fehler beim Laden.'));
    return;
  }

  function renderList() {
    listHost.innerHTML = '';
    for (const cat of categories) {
      const deleteBtn = h('button', { class: 'btn btn-sm btn-danger', type: 'button' }, 'Löschen');
      deleteBtn.addEventListener('click', async () => {
        if (!window.confirm(`Kategorie "${cat.name}" löschen?`)) return;
        try {
          await api.adminDeleteCategory(cat.id);
          categories = categories.filter((c) => c.id !== cat.id);
          renderList();
        } catch (err) {
          showToast(err instanceof ApiError ? err.message : 'Löschen fehlgeschlagen.', { type: 'error' });
        }
      });
      listHost.appendChild(
        h('div', { class: 'spread list-row' }, [
          h('span', {}, cat.name),
          deleteBtn,
        ])
      );
    }
  }
  renderList();

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!nameInput.value.trim()) return;
    addBtn.classList.add('is-loading');
    try {
      const created = await api.adminCreateCategory({ name: nameInput.value.trim() });
      categories.push(created);
      renderList();
      nameInput.value = '';
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Anlegen fehlgeschlagen.', { type: 'error' });
    } finally {
      addBtn.classList.remove('is-loading');
    }
  });
}
