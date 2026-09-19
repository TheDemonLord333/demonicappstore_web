const CSRF_HEADER = 'X-CSRF-Token';

let csrfToken = null;

export function setCsrfToken(token) {
  csrfToken = token;
}

export function getCsrfToken() {
  return csrfToken;
}

class ApiError extends Error {
  constructor(message, status, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

async function request(path, { method = 'GET', body, isForm = false } = {}) {
  const headers = {};
  if (!isForm) headers['Content-Type'] = 'application/json';
  if (csrfToken && method !== 'GET') headers[CSRF_HEADER] = csrfToken;

  let res;
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers,
      credentials: 'same-origin',
      body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
    });
  } catch {
    throw new ApiError('Der Demonic App Store Server ist momentan nicht erreichbar.', 0);
  }

  let data = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!res.ok) {
    throw new ApiError((data && data.error) || `Fehler ${res.status}`, res.status, data && data.details);
  }

  return data;
}

export const api = {
  listApps: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/apps${qs ? `?${qs}` : ''}`);
  },
  getApp: (id) => request(`/apps/${id}`),
  getAppVersions: (id) => request(`/apps/${id}/versions`),
  listCategories: () => request('/categories'),

  login: (username, password) => request('/auth/login', { method: 'POST', body: { username, password } }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  me: () => request('/auth/me'),

  adminListApps: () => request('/admin/apps'),
  adminGetApp: (id) => request(`/admin/apps/${id}`),
  adminCreateApp: (data) => request('/admin/apps', { method: 'POST', body: data }),
  adminUpdateApp: (id, data) => request(`/admin/apps/${id}`, { method: 'PUT', body: data }),
  adminDeleteApp: (id) => request(`/admin/apps/${id}`, { method: 'DELETE' }),

  adminUploadIcon: (id, file) => {
    const form = new FormData();
    form.append('icon', file);
    return request(`/admin/apps/${id}/icon`, { method: 'POST', body: form, isForm: true });
  },
  adminUploadScreenshots: (id, files) => {
    const form = new FormData();
    for (const f of files) form.append('screenshots', f);
    return request(`/admin/apps/${id}/screenshots`, { method: 'POST', body: form, isForm: true });
  },
  adminDeleteScreenshot: (id, screenshotId) =>
    request(`/admin/apps/${id}/screenshots/${screenshotId}`, { method: 'DELETE' }),

  adminAddVersion: (id, data) => request(`/admin/apps/${id}/versions`, { method: 'POST', body: data }),
  adminUpdateVersion: (id, versionId, data) =>
    request(`/admin/apps/${id}/versions/${versionId}`, { method: 'PUT', body: data }),
  adminDeleteVersion: (id, versionId) =>
    request(`/admin/apps/${id}/versions/${versionId}`, { method: 'DELETE' }),
  adminPublishVersion: (id, versionId) =>
    request(`/admin/apps/${id}/versions/${versionId}/publish`, { method: 'POST' }),
  adminUploadIpa: (id, versionId, file, onProgress) =>
    uploadWithProgress(`/api/admin/apps/${id}/versions/${versionId}/ipa`, file, onProgress),

  adminListCategories: () => request('/categories'),
  adminCreateCategory: (data) => request('/admin/categories', { method: 'POST', body: data }),
  adminUpdateCategory: (slug, data) => request(`/admin/categories/${slug}`, { method: 'PUT', body: data }),
  adminDeleteCategory: (slug) => request(`/admin/categories/${slug}`, { method: 'DELETE' }),
};

// XHR wird ausschließlich für den IPA-Upload verwendet, um Fortschritts-
// Events (große Dateien) zu erhalten – fetch() bietet dafür keinen Hook.
function uploadWithProgress(url, file, onProgress) {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append('ipa', file);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.setRequestHeader(CSRF_HEADER, csrfToken || '');

    xhr.upload.addEventListener('progress', (event) => {
      if (onProgress && event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    });

    xhr.addEventListener('load', () => {
      let data = null;
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        data = null;
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(data);
      } else {
        reject(new ApiError((data && data.error) || `Fehler ${xhr.status}`, xhr.status));
      }
    });

    xhr.addEventListener('error', () => reject(new ApiError('Upload fehlgeschlagen.', 0)));
    xhr.send(form);
  });
}

export { ApiError };
