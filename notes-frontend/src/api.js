const BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:3000';

// Mocked identity headers — see notes-backend/README.md "Authentication (mocked)".
// In production these would be replaced by an Authorization: Bearer <JWT> header.
const MOCK_USER_ID = 'user-1';
const MOCK_CLINIC_ID = 'clinic1';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-User-Id': MOCK_USER_ID,
      'X-Clinic-Id': MOCK_CLINIC_ID,
      ...(options.headers || {})
    }
  });
  if (!res.ok) {
    const text = await res.text();
    let message = text || res.statusText;
    try {
      const parsed = JSON.parse(text);
      if (parsed.message) message = parsed.message;
    } catch {}
    const err = new Error(`${res.status}: ${message}`);
    err.status = res.status;
    throw err;
  }
  if (res.status === 204) return null;
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

function buildQuery(params) {
  const entries = Object.entries(params || {}).filter(
    ([, v]) => v !== undefined && v !== null && v !== ''
  );
  if (entries.length === 0) return '';
  return '?' + entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
}

export function listNotes(patientId, params = {}) {
  return request(`/patients/${encodeURIComponent(patientId)}/notes${buildQuery(params)}`);
}

export function getNote(patientId, noteId) {
  return request(`/patients/${encodeURIComponent(patientId)}/notes/${encodeURIComponent(noteId)}`);
}

export function createNote(patientId, body) {
  return request(`/patients/${encodeURIComponent(patientId)}/notes`, {
    method: 'POST',
    body: JSON.stringify(body)
  });
}

export function updateNote(patientId, noteId, version, body) {
  return request(`/patients/${encodeURIComponent(patientId)}/notes/${encodeURIComponent(noteId)}`, {
    method: 'PUT',
    headers: { 'If-Match': String(version) },
    body: JSON.stringify(body)
  });
}

export function deleteNote(patientId, noteId) {
  return request(`/patients/${encodeURIComponent(patientId)}/notes/${encodeURIComponent(noteId)}`, {
    method: 'DELETE'
  });
}

export async function uploadAttachment(file) {
  const presignRes = await request('/uploads/presign', {
    method: 'POST',
    body: JSON.stringify({ filename: file.name, contentType: file.type })
  });
  const putRes = await fetch(presignRes.uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file
  });
  if (!putRes.ok) throw new Error(`Upload failed: ${putRes.status}`);
  return presignRes.key;
}

export function getAttachmentUrl(key) {
  return request(`/attachments${buildQuery({ key })}`);
}
