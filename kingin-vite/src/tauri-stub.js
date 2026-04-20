// tauri-stub.js — replaces Tauri desktop invoke() with real HTTP calls
// to the KingIn API server (kingin_api.py running on port 8080).
// The Vite dev server proxies /api/* to http://localhost:8080.

const API_BASE = '/api';

let _controlToken = null;

const _fetchToken = async () => {
  if (_controlToken) return _controlToken;
  try {
    const res = await fetch(`${API_BASE}/health`);
    if (res.ok) {
      const data = await res.json();
      _controlToken = data.token || null;
    }
  } catch (_) {}
  return _controlToken;
};

const _post = async (path, body = {}, withToken = false) => {
  const headers = { 'Content-Type': 'application/json' };
  if (withToken) {
    const tok = await _fetchToken();
    if (tok) headers['X-Control-Token'] = tok;
  }
  return fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
};

const _get = async (path) => {
  return fetch(`${API_BASE}${path}`);
};

export const invoke = async (command, args) => {
  switch (command) {
    case 'init_mt5_backend': {
      try {
        const res = await _post('/engine/init', args || {});
        return await res.json();
      } catch (err) {
        console.warn('[tauri-stub] init_mt5_backend failed, using fallback:', err.message);
        return { success: true };
      }
    }

    case 'auth_mt5': {
      const res = await _post('/engine/auth', args || {});
      if (!res.ok) throw new Error(`Auth failed: ${res.status}`);
      const data = await res.json();
      return JSON.stringify(data);
    }

    case 'read_engine_state': {
      const res = await _get('/engine/state');
      if (!res.ok) throw new Error(`Engine state fetch failed: ${res.status}`);
      const data = await res.json();
      return JSON.stringify(data);
    }

    case 'start_engine': {
      const res = await _post('/engine/start', args || {}, true);
      const data = await res.json();
      return JSON.stringify(data);
    }

    case 'stop_engine': {
      const res = await _post('/engine/stop', args || {}, true);
      const data = await res.json();
      return JSON.stringify(data);
    }

    default:
      console.warn(`[tauri-stub] Unknown command: ${command}`);
      return JSON.stringify({ success: false, error: `Unknown command: ${command}` });
  }
};

export const getControlToken = _fetchToken;
