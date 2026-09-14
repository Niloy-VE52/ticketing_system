const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export async function checkHealth() {
  try {
    const res = await fetch(`${API_BASE}/tickets/stats`, { method: 'GET' });
    return res.ok;
  } catch (err) {
    return false;
  }
}

export async function fetchTickets() {
  const res = await fetch(`${API_BASE}/tickets`);
  if (!res.ok) {
    throw new Error(`Failed to load tickets: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchStats() {
  const res = await fetch(`${API_BASE}/tickets/stats`);
  if (!res.ok) {
    throw new Error(`Failed to fetch stats: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchTicketById(id) {
  const res = await fetch(`${API_BASE}/tickets/${id}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch ticket #${id}`);
  }
  return res.json();
}

export async function updateTicketStatus(id, status) {
  const res = await fetch(`${API_BASE}/tickets/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) {
    throw new Error(`Failed to update status for ticket #${id}`);
  }
  return res.json();
}

export async function confirmTicketFix(id) {
  const res = await fetch(`${API_BASE}/tickets/${id}/confirm`, {
    method: 'POST',
  });
  if (!res.ok) {
    throw new Error(`Failed to confirm ticket #${id}`);
  }
  return res.json();
}

export async function pollMailbox() {
  const res = await fetch(`${API_BASE}/tickets/poll-now`, {
    method: 'POST',
  });
  if (!res.ok) {
    throw new Error('Failed to trigger mailbox poll');
  }
  return res.json();
}

export async function seedSampleTickets() {
  const res = await fetch(`${API_BASE}/tickets/seed-samples`, {
    method: 'POST',
  });
  if (!res.ok) {
    throw new Error('Failed to seed sample tickets');
  }
  return res.json();
}

export async function deleteTicket(id) {
  const res = await fetch(`${API_BASE}/tickets/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    throw new Error(`Failed to delete ticket #${id}`);
  }
  return res.json();
}

export async function sendTicketQuote(id, quoteData) {
  const res = await fetch(`${API_BASE}/tickets/${id}/send-quote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(quoteData),
  });
  if (!res.ok) {
    throw new Error(`Failed to send quotation for ticket #${id}`);
  }
  return res.json();
}

export async function approveTicketQuote(id, optionName) {
  const res = await fetch(`${API_BASE}/tickets/${id}/approve-quote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ selected_option: optionName || '' }),
  });
  if (!res.ok) {
    throw new Error(`Failed to approve quotation for ticket #${id}`);
  }
  return res.json();
}

export async function teamResolveAndClose(id, resolveData) {
  const res = await fetch(`${API_BASE}/tickets/${id}/team-resolve-and-close`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(resolveData),
  });
  if (!res.ok) {
    throw new Error(`Failed to send resolution email and close ticket #${id}`);
  }
  return res.json();
}

// --- Auth & Session helpers ---
export function getStoredToken() {
  return localStorage.getItem('auth_token');
}

export function setStoredToken(token) {
  if (token) {
    localStorage.setItem('auth_token', token);
  } else {
    localStorage.removeItem('auth_token');
  }
}

export function getStoredUser() {
  try {
    const userStr = localStorage.getItem('auth_user');
    return userStr ? JSON.parse(userStr) : null;
  } catch (e) {
    return null;
  }
}

export function setStoredUser(user) {
  if (user) {
    localStorage.setItem('auth_user', JSON.stringify(user));
  } else {
    localStorage.removeItem('auth_user');
  }
}

export async function loginUser(username, password) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || 'Invalid username or password');
  }
  const data = await res.json();
  setStoredToken(data.token);
  setStoredUser(data.user);
  return data;
}

export async function fetchCurrentUser(token = getStoredToken()) {
  if (!token) return null;
  const res = await fetch(`${API_BASE}/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    setStoredToken(null);
    setStoredUser(null);
    return null;
  }
  const user = await res.json();
  setStoredUser(user);
  return user;
}

export async function logoutUser() {
  try {
    await fetch(`${API_BASE}/auth/logout`, { method: 'POST' });
  } catch (e) {
    // Ignore network error on logout
  } finally {
    setStoredToken(null);
    setStoredUser(null);
  }
}

export async function forwardTicketToTeam(id, to_email, body) {
  const res = await fetch(`${API_BASE}/tickets/${id}/forward-team`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to_email, body }),
  });
  if (!res.ok) {
    throw new Error('Failed to forward email to team');
  }
  return res.json();
}


