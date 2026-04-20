// Stub for Tauri invoke() — runs in browser without Tauri desktop wrapper.
// Returns mock/no-op responses so the UI loads correctly in Replit.

export const invoke = async (command, args) => {
  console.warn(`[tauri-stub] invoke('${command}', ${JSON.stringify(args)}) called — using stub response`);

  switch (command) {
    case 'init_mt5_backend':
      return { success: true };

    case 'auth_mt5':
      return JSON.stringify({ success: true, token: 'demo_token_' + Date.now() });

    case 'read_engine_state':
      return JSON.stringify({
        running: false,
        equity: 10000,
        balance: 10000,
        daily_pnl: 0,
        open_positions: [],
        signals: [],
        engine_mode: 'demo',
      });

    case 'start_engine':
      return JSON.stringify({ success: true, message: 'Engine started (demo mode)' });

    case 'stop_engine':
      return JSON.stringify({ success: true, message: 'Engine stopped (demo mode)' });

    default:
      console.warn(`[tauri-stub] Unknown command: ${command}`);
      return JSON.stringify({ success: false, error: `Unknown command: ${command}` });
  }
};
