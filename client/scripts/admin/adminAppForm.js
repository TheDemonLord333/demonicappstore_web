import { h, formatBytes } from '../utils.js';
import { api, ApiError } from '../api.js';
import { renderAdminLayout } from './adminLayout.js';
import { showToast } from '../components/toast.js';
import { navigateTo } from '../router.js';

const DISTRIBUTION_TYPES = [
  { value: 'manifest', label: 'OTA-Manifest (itms-services)' },
  { value: 'direct', label: 'Direkter Link' },
  { value: 'testflight', label: 'TestFlight' },
  { value: 'external', label: 'Externe URL' },
];

const STATUSES = [
  { value: 'active', label: 'Aktiv' },
  { value: 'draft', label: 'Entwurf' },
  { value: 'unavailable', label: 'Nicht verfügbar' },
];

function field(labelText, input, hint) {
  return h('div', { class: 'field' }, [
    h('label', {}, labelText),
    input,
    hint ? h('span', { class: 'hint' }, hint) : null,
  ]);
}

async function loadCategories() {
  try {
    return await api.adminListCategories();
  } catch {
    return [];
  }
}

function buildBaseForm(app, categories, { isCreate }) {
  const idInput = h('input', { class: 'input', value: app?.id || '', placeholder: 'demonic-slots', required: true, disabled: !isCreate });
  const nameInput = h('input', { class: 'input', value: app?.name || '', required: true });
  const bundleInput = h('input', { class: 'input', value: app?.bundleId || '', placeholder: 'me.thedemonlord333.demonicslots', required: true });
  const descInput = h('textarea', { class: 'input', rows: '4' }, app?.description || '');
  const categorySelect = h(
    'select',
    { class: 'input' },
    [h('option', { value: '' }, 'Keine')].concat(
      categories.map((c) => h('option', { value: c.id, selected: app?.categorySlug === c.id }, c.name))
    )
  );
  const distSelect = h(
    'select',
    { class: 'input' },
    DISTRIBUTION_TYPES.map((d) =>
      h('option', { value: d.value, selected: (app?.distributionType || 'manifest') === d.value }, d.label)
    )
  );
  const installUrlInput = h('input', { class: 'input', value: app?.installUrl || '' });
  const manifestUrlInput = h('input', { class: 'input', value: app?.manifestUrl || '' });
  const featuredInput = h('input', { type: 'checkbox', checked: !!app?.featured });
  const statusSelect = isCreate
    ? null
    : h(
        'select',
        { class: 'input' },
        STATUSES.map((s) => h('option', { value: s.value, selected: app?.status === s.value }, s.label))
      );

  const submitBtn = h('button', { type: 'submit', class: 'btn btn-install' }, isCreate ? 'App anlegen' : 'Änderungen speichern');
  const errorEl = h('p', { class: 'form-error' }, '');

  const form = h('form', { class: 'stack' }, [
    h('div', { class: 'form-grid cols-2' }, [
      field('App-ID (Slug)', idInput, 'Kleinbuchstaben, Ziffern, Bindestriche – kann später nicht geändert werden.'),
      field('Name', nameInput),
    ]),
    h('div', { class: 'form-grid cols-2' }, [
      field('Bundle ID', bundleInput),
      field('Kategorie', categorySelect),
    ]),
    field('Beschreibung', descInput),
    h('div', { class: 'form-grid cols-2' }, [
      field('Verteilungsmethode', distSelect),
      statusSelect ? field('Status', statusSelect) : h('div', {}, []),
    ]),
    h('div', { class: 'form-grid cols-2' }, [
      field(
        'Installations-URL',
        installUrlInput,
        'Nur für "Direkter Link" / "TestFlight" / "Externe URL" nötig. Bei "OTA-Manifest" wird der Installationslink automatisch aus veröffentlichter Version + IPA erzeugt – dieses Feld bitte leer lassen.'
      ),
      field('Manifest-URL (optional override)', manifestUrlInput, 'Leer lassen für automatisch generiertes Manifest.'),
    ]),
    h('label', { class: 'row gap-2' }, [featuredInput, h('span', {}, 'Als "Featured" auf der Startseite hervorheben')]),
    errorEl,
    submitBtn,
  ]);

  function readValues() {
    return {
      id: idInput.value.trim(),
      name: nameInput.value.trim(),
      bundleId: bundleInput.value.trim(),
      description: descInput.value.trim(),
      category: categorySelect.value || null,
      distributionType: distSelect.value,
      installUrl: installUrlInput.value.trim() || null,
      manifestUrl: manifestUrlInput.value.trim() || null,
      featured: featuredInput.checked,
      status: statusSelect ? statusSelect.value : undefined,
    };
  }

  return { form, readValues, submitBtn, errorEl };
}

function renderIconPanel(app, onUpdated) {
  const preview = h('div', { class: 'app-card__icon-wrap w-96' }, [
    app.icon ? h('img', { src: app.icon, alt: '' }) : h('span', { class: 'app-card__icon-fallback' }, '?'),
  ]);
  const fileInput = h('input', { type: 'file', accept: 'image/png,image/jpeg,image/webp' });
  const drop = h('div', { class: 'file-drop' }, ['Icon auswählen oder hierher ziehen (PNG/JPEG/WebP)', fileInput]);

  drop.addEventListener('click', () => fileInput.click());
  ['dragover', 'dragleave', 'drop'].forEach((evt) =>
    drop.addEventListener(evt, (e) => {
      e.preventDefault();
      drop.classList.toggle('is-dragover', evt === 'dragover');
    })
  );
  drop.addEventListener('drop', async (e) => {
    const file = e.dataTransfer.files[0];
    if (file) await upload(file);
  });
  fileInput.addEventListener('change', async () => {
    if (fileInput.files[0]) await upload(fileInput.files[0]);
  });

  async function upload(file) {
    try {
      const updated = await api.adminUploadIcon(app.id, file);
      onUpdated(updated);
      showToast('Icon aktualisiert.', { type: 'success' });
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Upload fehlgeschlagen.', { type: 'error' });
    }
  }

  return h('div', { class: 'panel' }, [
    h('h2', { class: 'panel-title' }, 'App-Icon'),
    h('div', { class: 'row items-start' }, [preview, h('div', { class: 'flex-1' }, [drop])]),
  ]);
}

function renderScreenshotsPanel(app, onUpdated) {
  const fileInput = h('input', { type: 'file', accept: 'image/png,image/jpeg,image/webp', multiple: true });
  const drop = h('div', { class: 'file-drop' }, ['Screenshots auswählen oder hierher ziehen', fileInput]);
  const grid = h('div', { class: 'thumb-grid mt-4' });

  function renderGrid(screenshots, ids) {
    grid.innerHTML = '';
    screenshots.forEach((src, i) => {
      const shotId = ids ? ids[i] : null;
      const delBtn = h('button', { type: 'button', 'aria-label': 'Löschen' }, '×');
      if (shotId) {
        delBtn.addEventListener('click', async () => {
          try {
            const updated = await api.adminDeleteScreenshot(app.id, shotId);
            onUpdated(updated);
          } catch (err) {
            showToast(err instanceof ApiError ? err.message : 'Löschen fehlgeschlagen.', { type: 'error' });
          }
        });
      }
      grid.appendChild(h('figure', {}, [h('img', { src, alt: '' }), delBtn]));
    });
  }

  drop.addEventListener('click', () => fileInput.click());
  ['dragover', 'dragleave', 'drop'].forEach((evt) =>
    drop.addEventListener(evt, (e) => {
      e.preventDefault();
      drop.classList.toggle('is-dragover', evt === 'dragover');
    })
  );
  drop.addEventListener('drop', async (e) => {
    if (e.dataTransfer.files.length) await upload(Array.from(e.dataTransfer.files));
  });
  fileInput.addEventListener('change', async () => {
    if (fileInput.files.length) await upload(Array.from(fileInput.files));
  });

  async function upload(files) {
    try {
      const updated = await api.adminUploadScreenshots(app.id, files);
      onUpdated(updated);
      showToast('Screenshots hochgeladen.', { type: 'success' });
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Upload fehlgeschlagen.', { type: 'error' });
    }
  }

  const panel = h('div', { class: 'panel' }, [h('h2', { class: 'panel-title' }, 'Screenshots'), drop, grid]);
  panel.__renderGrid = renderGrid;
  return panel;
}

function renderVersionRow(app, version, onChanged) {
  const ipaInput = h('input', { type: 'file', accept: '.ipa' });
  const progressFill = h('div', { class: 'progress-fill' });
  const progressBar = h('div', { class: 'progress-track is-hidden' }, [progressFill]);

  const uploadBtn = h('button', { type: 'button', class: 'btn btn-sm btn-ghost' }, version.ipaPath ? 'IPA ersetzen' : 'IPA hochladen');
  uploadBtn.addEventListener('click', () => ipaInput.click());
  ipaInput.addEventListener('change', async () => {
    const file = ipaInput.files[0];
    if (!file) return;
    progressBar.classList.remove('is-hidden');
    try {
      await api.adminUploadIpa(app.id, version.id, file, (pct) => {
        progressFill.style.width = `${pct}%`;
      });
      showToast('IPA hochgeladen.', { type: 'success' });
      onChanged();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'IPA-Upload fehlgeschlagen.', { type: 'error' });
    } finally {
      progressBar.classList.add('is-hidden');
    }
  });

  const publishBtn = h(
    'button',
    { type: 'button', class: `btn btn-sm ${version.isCurrent ? 'btn-unavailable' : 'btn-update'}`, disabled: version.isCurrent },
    version.isCurrent ? 'Aktuell' : 'Veröffentlichen'
  );
  publishBtn.addEventListener('click', async () => {
    try {
      await api.adminPublishVersion(app.id, version.id);
      onChanged();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Veröffentlichen fehlgeschlagen.', { type: 'error' });
    }
  });

  const deleteBtn = h('button', { type: 'button', class: 'btn btn-sm btn-danger' }, 'Löschen');
  deleteBtn.addEventListener('click', async () => {
    if (!window.confirm(`Version ${version.version} löschen?`)) return;
    try {
      await api.adminDeleteVersion(app.id, version.id);
      onChanged();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Löschen fehlgeschlagen.', { type: 'error' });
    }
  });

  return h('div', { class: 'version-row version-row--stacked' }, [
    h('div', { class: 'spread' }, [
      h('div', {}, [
        h('div', { class: 'version-row__num' }, [
          `${version.version} (Build ${version.build})`,
          version.isCurrent ? h('span', { class: 'badge badge-violet ml-2' }, 'Live') : null,
        ]),
        h('div', { class: 'version-row__notes' }, version.releaseNotes || 'Keine Release Notes.'),
        h('div', { class: 'text-xs text-muted mt-1' }, [
          version.ipaPath ? `IPA: ${formatBytes(version.ipaSize)}` : 'Noch keine IPA hochgeladen',
        ]),
      ]),
      h('div', { class: 'row' }, [publishBtn, deleteBtn]),
    ]),
    h('div', { class: 'row' }, [uploadBtn, ipaInput]),
    progressBar,
  ]);
}

function renderVersionsPanel(app, onChanged) {
  const versionInput = h('input', { class: 'input', placeholder: '1.0.0', required: true });
  const buildInput = h('input', { class: 'input', type: 'number', min: '0', value: '1' });
  const notesInput = h('textarea', { class: 'input', rows: '2', placeholder: 'Release Notes' });
  const addBtn = h('button', { class: 'btn btn-install btn-sm', type: 'submit' }, '+ Version hinzufügen');

  const addForm = h('form', { class: 'stack mb-5' }, [
    h('div', { class: 'form-grid cols-2' }, [field('Version', versionInput), field('Build', buildInput)]),
    field('Release Notes', notesInput),
    addBtn,
  ]);

  addForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!versionInput.value.trim()) return;
    addBtn.classList.add('is-loading');
    try {
      await api.adminAddVersion(app.id, {
        version: versionInput.value.trim(),
        build: parseInt(buildInput.value, 10) || 1,
        releaseNotes: notesInput.value.trim(),
      });
      versionInput.value = '';
      notesInput.value = '';
      onChanged();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Anlegen fehlgeschlagen.', { type: 'error' });
    } finally {
      addBtn.classList.remove('is-loading');
    }
  });

  const list = h('div', { class: 'stack' });
  const panel = h('div', { class: 'panel' }, [h('h2', { class: 'panel-title' }, 'Versionen'), addForm, list]);
  panel.__renderList = (versions) => {
    list.innerHTML = '';
    if (versions.length === 0) {
      list.appendChild(h('p', { class: 'text-muted' }, 'Noch keine Version angelegt.'));
      return;
    }
    for (const v of versions) list.appendChild(renderVersionRow(app, v, onChanged));
  };
  return panel;
}

export async function renderAdminAppForm({ params }) {
  const isCreate = !params.id;
  const main = renderAdminLayout('/admin');
  const categories = await loadCategories();

  if (isCreate) {
    main.appendChild(h('h1', { class: 'section__title mb-4' }, 'Neue App anlegen'));
    const { form, readValues, submitBtn, errorEl } = buildBaseForm(null, categories, { isCreate: true });
    main.appendChild(h('div', { class: 'panel' }, [form]));

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      errorEl.textContent = '';
      submitBtn.classList.add('is-loading');
      try {
        const app = await api.adminCreateApp(readValues());
        showToast(`${app.name} wurde angelegt.`, { type: 'success' });
        navigateTo(`/admin/apps/${app.id}`);
      } catch (err) {
        errorEl.textContent = err instanceof ApiError ? err.message : 'Anlegen fehlgeschlagen.';
      } finally {
        submitBtn.classList.remove('is-loading');
      }
    });
    return;
  }

  let app;
  try {
    app = await api.adminGetApp(params.id);
  } catch (err) {
    main.appendChild(h('div', { class: 'empty-state' }, [h('p', {}, err instanceof ApiError ? err.message : 'App nicht gefunden.')]));
    return;
  }

  main.appendChild(
    h('div', { class: 'admin-topbar' }, [h('h1', { class: 'section__title' }, app.name), h('a', { href: `/app/${app.id}`, class: 'btn btn-ghost btn-sm' }, 'Im Store ansehen')])
  );

  const { form, readValues, submitBtn, errorEl } = buildBaseForm(app, categories, { isCreate: false });
  main.appendChild(h('div', { class: 'panel mb-5' }, [form]));

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    errorEl.textContent = '';
    submitBtn.classList.add('is-loading');
    try {
      app = await api.adminUpdateApp(app.id, readValues());
      showToast('Änderungen gespeichert.', { type: 'success' });
    } catch (err) {
      errorEl.textContent = err instanceof ApiError ? err.message : 'Speichern fehlgeschlagen.';
    } finally {
      submitBtn.classList.remove('is-loading');
    }
  });

  const iconPanelHost = h('div', { class: 'mb-5' });
  const screenshotsPanelHost = h('div', { class: 'mb-5' });
  const versionsPanelHost = h('div', { class: 'mb-5' });
  main.appendChild(iconPanelHost);
  main.appendChild(screenshotsPanelHost);
  main.appendChild(versionsPanelHost);

  function mountIconPanel() {
    iconPanelHost.innerHTML = '';
    iconPanelHost.appendChild(renderIconPanel(app, (updated) => {
      app = updated;
      mountIconPanel();
    }));
  }
  mountIconPanel();

  const screenshotsPanel = renderScreenshotsPanel(app, (updated) => {
    app = updated;
    screenshotsPanel.__renderGrid(app.screenshots || [], null);
  });
  screenshotsPanelHost.appendChild(screenshotsPanel);
  screenshotsPanel.__renderGrid(app.screenshots || [], null);

  async function refreshVersions() {
    app = await api.adminGetApp(app.id);
    versionsPanel.__renderList(app.versions || []);
  }
  const versionsPanel = renderVersionsPanel(app, refreshVersions);
  versionsPanelHost.appendChild(versionsPanel);
  versionsPanel.__renderList(app.versions || []);

  const dangerZone = h('div', { class: 'panel' }, [
    h('h2', { class: 'panel-title' }, 'Gefahrenzone'),
    h('p', { class: 'text-muted text-sm mb-3' }, 'Löscht die App inkl. aller Versionen, Screenshots und Uploads unwiderruflich.'),
  ]);
  const deleteAppBtn = h('button', { class: 'btn btn-danger', type: 'button' }, 'App löschen');
  deleteAppBtn.addEventListener('click', async () => {
    if (!window.confirm(`"${app.name}" wirklich unwiderruflich löschen?`)) return;
    try {
      await api.adminDeleteApp(app.id);
      showToast('App gelöscht.', { type: 'success' });
      navigateTo('/admin');
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Löschen fehlgeschlagen.', { type: 'error' });
    }
  });
  dangerZone.appendChild(deleteAppBtn);
  main.appendChild(dangerZone);
}
