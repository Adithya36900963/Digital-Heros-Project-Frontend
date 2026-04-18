const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export class ApiError extends Error {
  constructor(message, status, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export async function api(path, options = {}) {
  const token = localStorage.getItem('dh_token');
  const headers = new Headers(options.headers || {});

  if (!(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : {};

  if (!response.ok) {
    throw new ApiError(data.message || 'Request failed', response.status, data.details);
  }

  return data;
}
