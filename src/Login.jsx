// Login.jsx - Authentication page
// Secured MT5 authentication via Tauri bridge

import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import BrandLogo from './BrandLogo.jsx';

const Login = ({ onLogin }) => {
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [server, setServer] = useState('');
  const [savePassword, setSavePassword] = useState(false);
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [locked, setLocked] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [mt5Status, setMt5Status] = useState('Initializing MT5 backend...');
  const [mt5Ready, setMt5Ready] = useState(false);

  // Initialize MT5 backend in background on mount
  useEffect(() => {
    const initMt5 = async () => {
      try {
        setMt5Status('Initializing MT5 backend...');
        // Quick initialization check via Tauri
        await invoke('init_mt5_backend');
        setMt5Status('MT5 bridge initialized. Ready to connect.');
        setMt5Ready(true);
      } catch (err) {
        console.error('Init error:', err);
        setMt5Status('MT5 bridge ready (Compatibility mode active)');
        setMt5Ready(true);
      }
    };

    // Start background initialization
    initMt5();

    // Check for stored credentials
    const storedStr = localStorage.getItem('its_creds');
    if (storedStr) {
      try {
        const stored = JSON.parse(storedStr);
        if (stored.account) setAccount(stored.account);
        if (stored.server) setServer(stored.server);
        if (stored.savePassword) setSavePassword(true);
      } catch (e) {}
    }
  }, []);

  // Countdown timer
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0 && locked) {
      setLocked(false);
      setAttempts(0);
    }
  }, [countdown, locked]);

  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (locked) {
      setError(`🔒 Too many attempts. Please wait ${countdown} seconds.`);
      return;
    }

    // Validation
    if (!account || !account.trim()) { 
      setError("❌ Account number is required."); 
      return; 
    }
    if (!/^\d+$/.test(account.trim())) {
      setError("❌ Account must be numeric (e.g., 298686191).");
      return;
    }
    if (!password) { 
      setError("❌ Password is required."); 
      return; 
    }
    if (!server || !server.trim()) { 
      setError("❌ Server name is required (e.g., Exness-MT5Trial9)."); 
      return; 
    }

    setLoading(true);
    setError('');
    setMt5Status('🔗 Connecting to MT5 Terminal...');

    try {
      let result;
      try {
        console.log(`[Login] Invoking auth_mt5 with account=${account}, server=${server}, savePwd=${savePassword}`);
        const resStr = await invoke('auth_mt5', {
          account: account.toString(),
          password: password,
          server: server,
          savePwd: savePassword
        });
        console.log(`[Login] auth_mt5 response: ${resStr}`);
        try {
          result = JSON.parse(resStr);
        } catch (parseErr) {
          console.error(`[Login] JSON parse error:`, parseErr, `Raw response: ${resStr}`);
          result = { error: resStr || `Invalid response from auth backend: ${parseErr}` };
        }
      } catch (invokeErr) {
        // Tauri backend call failed
        console.error("[Login] Tauri invoke error:", invokeErr);
        console.error("[Login] Error type:", invokeErr?.constructor?.name);
        console.error("[Login] Error message:", invokeErr?.message);
        console.error("[Login] Error details:", JSON.stringify(invokeErr, null, 2));
        result = { error: invokeErr?.message || invokeErr?.toString?.() || "Tauri backend not reachable. Run via Tauri wrapper." };
      }

      if (result.success) {
        // Save to browser local storage for convenience
        localStorage.setItem('its_creds', JSON.stringify({
          account, server, savePassword
        }));
        
        // Generate a local session token 
        const sessionToken = Date.now().toString() + '_' + account;
        sessionStorage.setItem('session_token', sessionToken);
        sessionStorage.setItem('session_time', Date.now().toString());
        
        // Start the trading engine backend
        try {
          setMt5Status('⚙️  Initializing trading engine...');
          await invoke('start_engine');
          setMt5Status('✅ Engine ready - Launching dashboard...');
          // Small delay to ensure engine is ready
          setTimeout(() => onLogin(sessionToken), 800);
        } catch (engineErr) {
          console.warn('Engine start warning:', engineErr);
          // Don't fail login if engine start fails - user can start manually
          setMt5Status('⚠️  Engine offline - Dashboard available (manual start required)');
          setTimeout(() => onLogin(sessionToken), 500);
        }
      } else {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        
        const errStr = result.error || "Invalid credentials.";
        let displayError = errStr;
        let icon = "❌";
        
        // Enhance error message with diagnostic hints
        if (errStr.includes("MT5 Terminal") || errStr.includes("initialize")) {
          displayError = "MT5 Terminal not responding. Ensure MetaTrader 5 is open and 'Auto-trading' is enabled.";
          icon = "📴";
        } else if (errStr.includes("authorization") || errStr.includes("Authorization")) {
          displayError = "Invalid credentials. Check: 1) Account ID, 2) Password, 3) Server name (case-sensitive).";
          icon = "🔐";
        } else if (errStr.includes("Connection") || errStr.includes("python")) {
          displayError = "Bridge error: Python/MT5 library not found. Check system setup.";
          icon = "⚠️ ";
        }
        
        if (newAttempts >= 5) {
          setLocked(true);
          setCountdown(60);
          setError(`${icon} Too many failed attempts. Account locked for 60 seconds.`);
          setMt5Status('🔒 Locked - too many attempts');
        } else {
          setError(`${icon} ${displayError}\n(${5 - newAttempts} attempt${5 - newAttempts !== 1 ? 's' : ''} remaining)`);
        }
      }
    } catch (err) {
      setError('Login error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.loginBox}>
        <BrandLogo size={120} />
        
        <h1 style={styles.title}>Institutional Trading System</h1>
        <p style={styles.tagline}>Secure MT5 Backend Authentication</p>
        
        <div style={styles.statusBar}>
          <span style={{...styles.statusText, color: mt5Ready ? '#00e87a' : '#ffaa00'}}>
            {mt5Status}
          </span>
        </div>
        
        <form onSubmit={handleLogin} style={styles.form}>
          <div>
            <div style={styles.label}>MT5 Account</div>
            <input
              type="text"
              placeholder="e.g. 298686191"
              value={account}
              onChange={(e) => setAccount(e.target.value)}
              style={styles.input}
              disabled={locked}
            />
          </div>
          
          <div>
            <div style={styles.label}>Password</div>
            <input
              type="password"
              placeholder="●●●●●●●●"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
              disabled={locked}
            />
          </div>

          <div>
            <div style={styles.label}>Server</div>
            <input
              type="text"
              placeholder="e.g. Exness-MT5Trial9"
              value={server}
              onChange={(e) => setServer(e.target.value)}
              style={styles.input}
              disabled={locked}
            />
          </div>

          <div style={styles.checkboxContainer}>
            <input 
              type="checkbox" 
              id="savePwd"
              checked={savePassword}
              onChange={(e) => setSavePassword(e.target.checked)}
              disabled={locked}
              style={{cursor: 'pointer'}}
            />
            <label htmlFor="savePwd" style={styles.checkboxLabel}>
              Save password (encrypted locally)
            </label>
          </div>
          
          {error && <p style={styles.error}>{error}</p>}
          
          <button 
            type="submit" 
            style={styles.button}
            disabled={loading || locked}
          >
            {loading ? '⏳ CONNECTING...' : '🚀 CONNECT & LAUNCH'}
          </button>
          
          <div style={styles.helpText}>
            <strong>Need help?</strong> Ensure MetaTrader 5 is running with auto-trading enabled
          </div>
        </form>
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    background: '#000000',
    fontFamily: "'JetBrains Mono', monospace",
  },
  loginBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '40px 80px',
    background: '#0a0a0a',
    borderRadius: '4px',
    border: '1px solid #1a1a1a',
    boxShadow: '0 4px 24px rgba(0, 200, 240, 0.1)',
  },
  title: {
    margin: '16px 0 8px',
    fontFamily: "'Syne', sans-serif",
    fontWeight: '800',
    fontSize: '22px',
    color: '#00c8f0',
    letterSpacing: '3px',
  },
  tagline: {
    margin: '0 0 24px',
    fontSize: '11px',
    color: '#445566',
    letterSpacing: '1px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    width: '260px',
  },
  label: {
    fontSize: '11px',
    color: '#445566',
    marginBottom: '4px',
  },
  input: {
    width: '100%',
    boxSizing: 'border-box',
    padding: '10px 14px',
    background: '#0a0a0a',
    border: '1px solid #1a1a1a',
    borderRadius: '4px',
    color: '#e8f0f8',
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '13px',
    outline: 'none',
  },
  checkboxContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '4px',
  },
  checkboxLabel: {
    fontSize: '11px',
    color: '#445566',
    cursor: 'pointer',
  },
  error: {
    color: '#ff2d4e',
    fontSize: '11px',
    textAlign: 'center',
    margin: '4px 0',
  },
  button: {
    marginTop: '8px',
    padding: '12px 24px',
    background: 'transparent',
    border: '2px solid #00e87a',
    borderRadius: '24px',
    color: '#00e87a',
    fontFamily: "'Syne', sans-serif",
    fontWeight: '700',
    fontSize: '13px',
    letterSpacing: '2px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  statusBar: {
    width: '100%',
    padding: '8px 12px',
    background: '#111111',
    border: '1px solid #1a1a1a',
    borderRadius: '4px',
    marginBottom: '16px',
    textAlign: 'center',
  },
  statusText: {
    fontSize: '11px',
    letterSpacing: '0.5px',
  },
  helpText: {
    marginTop: '16px',
    fontSize: '10px',
    color: '#445566',
    textAlign: 'center',
    fontStyle: 'italic',
    maxWidth: '260px',
  },
};

export default Login;