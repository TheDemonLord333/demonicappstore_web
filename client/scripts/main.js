import { addRoute, setNotFound, initRouter, navigateTo } from './router.js';
import { renderHeader, renderTabBar } from './components/header.js';
import { getHeaderContainer, getTabBarContainer } from './dom.js';
import { setState, subscribe } from './state.js';
import { api, setCsrfToken } from './api.js';
import { showToast } from './components/toast.js';

import { renderHome } from './views/home.js';
import { renderAppDetail } from './views/appDetail.js';
import { renderUpdates } from './views/updates.js';
import { renderSearch } from './views/search.js';
import { renderNotFound } from './views/notFound.js';

import { renderAdminLogin } from './admin/adminLogin.js';
import { renderAdminDashboard } from './admin/adminDashboard.js';
import { renderAdminAppForm } from './admin/adminAppForm.js';
import { renderAdminCategories } from './admin/adminCategories.js';

// ---------------------------------------------------------------- Setup ----

function detectWeakDevice() {
  const cores = navigator.hardwareConcurrency || 4;
  if (cores <= 2) document.documentElement.classList.add('reduce-fx');
}
detectWeakDevice();

document.body.classList.add('has-tab-bar');

function mountHeader() {
  renderHeader(getHeaderContainer(), {
    onSearch: (term) => window.dispatchEvent(new CustomEvent('demonic:search', { detail: { term } })),
  });
  renderTabBar(getTabBarContainer());
}

window.addEventListener('demonic:route-change', mountHeader);

// ------------------------------------------------------------ Admin-Guard --

async function withAdminAuth(handler) {
  try {
    const { user, csrfToken } = await api.me();
    setCsrfToken(csrfToken);
    setState({ user });
    return handler;
  } catch {
    setState({ user: null });
    return renderAdminLogin;
  }
}

function adminRoute(handler) {
  return async (ctx) => {
    const resolved = await withAdminAuth(handler);
    return resolved(ctx);
  };
}

// -------------------------------------------------------------- Routen -----

addRoute('/', renderHome);
addRoute('/app/:id', renderAppDetail);
addRoute('/updates', renderUpdates);
addRoute('/search', renderSearch);

addRoute('/admin', adminRoute(renderAdminDashboard));
addRoute('/admin/categories', adminRoute(renderAdminCategories));
addRoute('/admin/apps/new', adminRoute(renderAdminAppForm));
addRoute('/admin/apps/:id', adminRoute(renderAdminAppForm));

setNotFound(renderNotFound);

// --------------------------------------------------------- Online-Status ---

window.addEventListener('offline', () => {
  setState({ online: false });
  showToast('Keine Internetverbindung. Zeige zuletzt geladene Daten.', { type: 'error', duration: 5000 });
});
window.addEventListener('online', () => {
  setState({ online: true });
  showToast('Verbindung wiederhergestellt.', { type: 'success' });
});

// ------------------------------------------------------- Service Worker ----

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').catch(() => {
      /* PWA ist ein Enhancement – Fehler hier dürfen die App nicht blockieren. */
    });
  });
}

// ------------------------------------------------------------- Start -------

subscribe(() => mountHeader());
initRouter();
