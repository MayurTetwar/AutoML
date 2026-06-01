const API = import.meta.env.VITE_API_BASE_URL;

function getHeaders(isJson = true) {
  const headers = {};
  const token = localStorage.getItem('access_token');
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (isJson) headers['Content-Type'] = 'application/json';
  return headers;
}

async function handleResponse(res, skipAuthRedirect = false) {
  if (res.status === 401 && !skipAuthRedirect) {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_id');
    window.location.href = '/signin';
    throw new Error('Session expired');
  }
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || data.message || `Request failed (${res.status})`);
  }
  return data;
}

/* ——————— Auth ——————— */
export async function signup(email, password) {
  const res = await fetch(`${API}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return handleResponse(res, true);
}

export async function login(email, password) {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return handleResponse(res, true);
}

export async function logout() {
  const res = await fetch(`${API}/auth/logout`, {
    method: 'POST',
    headers: getHeaders(false),
  });
  return handleResponse(res);
}

export async function deleteAccount() {
  const res = await fetch(`${API}/auth/delete-account`, {
    method: 'DELETE',
    headers: getHeaders(false),
  });
  return handleResponse(res);
}

export async function verifyToken() {
  const token = localStorage.getItem('access_token');
  if (!token) return false;
  try {
    const res = await fetch(`${API}/auth/me`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user_id');
      return false;
    }
    return true;
  } catch {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_id');
    return false;
  }
}

/* ——————— Training ——————— */
export async function trainManual(formData) {
  const res = await fetch(`${API}/train/`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
    body: formData,
  });
  return handleResponse(res);
}

export async function trainAuto(formData) {
  const res = await fetch(`${API}/train/auto`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
    body: formData,
  });
  return handleResponse(res);
}

export async function getJobs() {
  const res = await fetch(`${API}/train/jobs`, {
    method: 'GET',
    headers: getHeaders(false),
  });
  return handleResponse(res);
}

export async function getJobStatus(jobId) {
  const res = await fetch(`${API}/train/status/${jobId}`, {
    method: 'GET',
    headers: getHeaders(false),
  });
  return handleResponse(res);
}

/* ——————— Models ——————— */
export async function getModels() {
  const res = await fetch(`${API}/models/`, {
    method: 'GET',
    headers: getHeaders(false),
  });
  return handleResponse(res);
}

export async function getModelDetail(modelId) {
  const res = await fetch(`${API}/models/${modelId}`, {
    method: 'GET',
    headers: getHeaders(false),
  });
  return handleResponse(res);
}

export async function getModelFeatures(modelId) {
  const res = await fetch(`${API}/models/${modelId}/features`, {
    method: 'GET',
    headers: getHeaders(false),
  });
  return handleResponse(res);
}

export async function deleteModel(modelId) {
  const res = await fetch(`${API}/models/${modelId}`, {
    method: 'DELETE',
    headers: getHeaders(false),
  });
  return handleResponse(res);
}

/* ——————— API Keys ——————— */
export async function createApiKey(name) {
  const res = await fetch(`${API}/api-keys/`, {
    method: 'POST',
    headers: getHeaders(true),
    body: JSON.stringify({ name }),
  });
  return handleResponse(res);
}

export async function getApiKeys() {
  const res = await fetch(`${API}/api-keys/`, {
    method: 'GET',
    headers: getHeaders(false),
  });
  return handleResponse(res);
}

export async function deleteApiKey(keyId) {
  const res = await fetch(`${API}/api-keys/${keyId}`, {
    method: 'DELETE',
    headers: getHeaders(false),
  });
  return handleResponse(res);
}
