const API_BASE = '/api';

const _post = async (path, body = {}) => {
  const headers = { 'Content-Type': 'application/json' };
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
      const res = await _post('/engine/start', args || {});
      const data = await res.json();
      return JSON.stringify(data);
    }

    case 'stop_engine': {
      const res = await _post('/engine/stop', args || {});
      const data = await res.json();
      return JSON.stringify(data);
    }

    default:
      console.warn(`[tauri-stub] Unknown command: ${command}`);
      return JSON.stringify({ success: false, error: `Unknown command: ${command}` });
  }
};

export const getControlToken = async () => null;
