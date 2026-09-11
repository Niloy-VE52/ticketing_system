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
