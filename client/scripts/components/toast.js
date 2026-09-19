import { h, qs } from '../utils.js';

let stack = null;

function ensureStack() {
  if (!stack) {
    stack = h('div', { class: 'toast-stack', role: 'status', 'aria-live': 'polite' });
    document.body.appendChild(stack);
  }
  return stack;
}

export function showToast(message, { type = 'default', duration = 4000 } = {}) {
  const el = ensureStack();
  const toast = h(
    'div',
    { class: `toast${type === 'error' ? ' is-error' : ''}${type === 'success' ? ' is-success' : ''}` },
    message
  );
  el.appendChild(toast);
  setTimeout(() => {
    toast.style.transition = 'opacity 200ms ease';
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 220);
  }, duration);
}

export function clearToasts() {
  if (stack) qs('.toast-stack')?.replaceChildren();
}
