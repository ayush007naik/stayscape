const BASE = import.meta.env.VITE_API_URL || '/api';

const TOKEN_KEY = 'stayscape_token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

async function request(path, { method = 'GET', body, auth = false } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    const message = (data && data.error) || `Request failed (${res.status})`;
    const error = new Error(message);
    error.status = res.status;
    throw error;
  }
  return data;
}

export const api = {
  register: (payload) => request('/auth/register', { method: 'POST', body: payload }),
  login: (payload) => request('/auth/login', { method: 'POST', body: payload }),
  me: () => request('/auth/me', { auth: true }),

  listListings: (query = {}) => {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') params.set(k, v);
    });
    const qs = params.toString();
    return request(`/listings${qs ? `?${qs}` : ''}`);
  },
  getListing: (id) => request(`/listings/${id}`),
  createListing: (payload) => request('/listings', { method: 'POST', body: payload, auth: true }),
  updateListing: (id, payload) => request(`/listings/${id}`, { method: 'PUT', body: payload, auth: true }),
  deleteListing: (id) => request(`/listings/${id}`, { method: 'DELETE', auth: true }),
  checkAvailability: (id, checkIn, checkOut) =>
    request(`/listings/${id}/availability?check_in=${checkIn}&check_out=${checkOut}`),
  createBooking: (id, payload) =>
    request(`/listings/${id}/bookings`, {
      method: 'POST',
      body: { check_in: payload.checkIn, check_out: payload.checkOut, guests: payload.guests },
      auth: true,
    }),
  listReviews: (id) => request(`/listings/${id}/reviews`),
  createReview: (id, payload) => request(`/listings/${id}/reviews`, { method: 'POST', body: payload, auth: true }),

  myTrips: () => request('/bookings/mine', { auth: true }),
  cancelBooking: (id) => request(`/bookings/${id}/cancel`, { method: 'PATCH', auth: true }),

  hostListings: () => request('/host/listings', { auth: true }),
  hostBookings: () => request('/host/bookings', { auth: true }),
  hostStats: () => request('/host/stats', { auth: true }),
};
