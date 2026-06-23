const BASE_URL = 'https://campus-assistant-backend-hahn.onrender.com';

async function request(method, path, body = null) {
  const token = localStorage.getItem('token');
  const headers = {};

  if (!(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const options = {
    method,
    headers,
  };

  if (body) {
    options.body = body instanceof FormData ? body : JSON.stringify(body);
  }

  const response = await fetch(`${BASE_URL}${path}`, options);

  if (response.status === 401 && path !== '/api/login') {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    // Prevent infinite redirect loops on public paths
    if (window.location.pathname !== '/login' && window.location.pathname !== '/register' && window.location.pathname !== '/forgot-password' && window.location.pathname !== '/reset-password') {
      window.location.href = '/login';
    }
    throw new Error('Session expired or invalid. Please log in again.');
  }

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail || 'An error occurred.');
  }

  return data;
}

export const api = {
  get: (path) => request('GET', path),
  post: (path, body) => request('POST', path, body),
  put: (path, body) => request('PUT', path, body),
  delete: (path) => request('DELETE', path),
};
