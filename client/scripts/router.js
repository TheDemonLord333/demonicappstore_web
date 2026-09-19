const routes = [];
let notFoundHandler = () => {};
let currentAbortController = null;

export function addRoute(pattern, handler) {
  const paramNames = [];
  const regex = new RegExp(
    '^' +
      pattern
        .replace(/\/$/, '')
        .split('/')
        .map((segment) => {
          if (segment.startsWith(':')) {
            paramNames.push(segment.slice(1));
            return '([^/]+)';
          }
          return segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        })
        .join('/') +
      '/?$'
  );
  routes.push({ regex, paramNames, handler });
}

export function setNotFound(handler) {
  notFoundHandler = handler;
}

function matchRoute(pathname) {
  for (const route of routes) {
    const match = route.regex.exec(pathname);
    if (match) {
      const params = {};
      route.paramNames.forEach((name, i) => {
        params[name] = decodeURIComponent(match[i + 1]);
      });
      return { handler: route.handler, params };
    }
  }
  return null;
}

async function render() {
  const pathname = window.location.pathname;

  if (currentAbortController) currentAbortController.abort();
  currentAbortController = new AbortController();
  const { signal } = currentAbortController;

  const found = matchRoute(pathname);
  window.scrollTo({ top: 0 });

  window.dispatchEvent(new CustomEvent('demonic:route-change', { detail: { pathname } }));

  if (!found) {
    await notFoundHandler({ signal });
    return;
  }
  await found.handler({ params: found.params, signal });
}

export function navigateTo(path, { replace = false } = {}) {
  const samePath = path === window.location.pathname + window.location.search;
  if (!samePath) {
    if (replace) window.history.replaceState({}, '', path);
    else window.history.pushState({}, '', path);
  }
  // Auch bei gleichbleibendem Pfad neu rendern (z. B. nach Login/Logout auf
  // derselben "/admin"-URL, wo sich nur der Auth-Status geändert hat).
  render();
}

export function initRouter() {
  window.addEventListener('popstate', render);

  window.addEventListener('demonic:navigate', (event) => {
    navigateTo(event.detail.path);
  });

  document.addEventListener('click', (event) => {
    const anchor = event.target.closest('a[href]');
    if (!anchor) return;
    if (anchor.target === '_blank' || anchor.hasAttribute('download')) return;
    if (anchor.getAttribute('href').startsWith('http') && anchor.origin !== window.location.origin) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    const href = anchor.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
    if (anchor.hasAttribute('data-external')) return;

    event.preventDefault();
    navigateTo(href);
  });

  render();
}
