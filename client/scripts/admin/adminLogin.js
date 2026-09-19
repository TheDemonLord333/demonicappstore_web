import { h } from '../utils.js';
import { getViewport } from '../dom.js';
import { api, setCsrfToken, ApiError } from '../api.js';
import { setState } from '../state.js';
import { navigateTo } from '../router.js';

export function renderAdminLogin() {
  const viewport = getViewport();
  viewport.innerHTML = '';

  const errorEl = h('p', { class: 'form-error' }, '');
  const usernameInput = h('input', { class: 'input', name: 'username', autocomplete: 'username', required: true });
  const passwordInput = h('input', {
    class: 'input',
    type: 'password',
    name: 'password',
    autocomplete: 'current-password',
    required: true,
  });

  const submitBtn = h('button', { type: 'submit', class: 'btn btn-install btn-block' }, 'Anmelden');

  const form = h(
    'form',
    { class: 'stack' },
    [
      h('div', { class: 'field' }, [h('label', {}, 'Benutzername'), usernameInput]),
      h('div', { class: 'field' }, [h('label', {}, 'Passwort'), passwordInput]),
      errorEl,
      submitBtn,
    ]
  );

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    errorEl.textContent = '';
    submitBtn.classList.add('is-loading');
    submitBtn.disabled = true;
    try {
      const { user, csrfToken } = await api.login(usernameInput.value, passwordInput.value);
      setCsrfToken(csrfToken);
      setState({ user });
      navigateTo('/admin');
    } catch (err) {
      errorEl.textContent = err instanceof ApiError ? err.message : 'Anmeldung fehlgeschlagen.';
    } finally {
      submitBtn.classList.remove('is-loading');
      submitBtn.disabled = false;
    }
  });

  viewport.appendChild(
    h('div', { class: 'view auth-shell' }, [
      h('div', { class: 'auth-card' }, [
        h('h1', { class: 'auth-card__title' }, 'Admin-Anmeldung'),
        h('p', { class: 'auth-card__sub' }, 'Demonic App Store Verwaltung'),
        form,
      ]),
    ])
  );

  usernameInput.focus();
}
