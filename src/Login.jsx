// Login.jsx - Authentication page
// Secured MT5 authentication via Tauri bridge

import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
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

  // Check for stored credentials on mount
  useEffect(() => {
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
      setError(`Too many attempts. Please wait ${countdown} seconds.`);
      return;
    }

    if (!account) { setError("Account number is required."); return; }
    if (!password) { setError("Password is required."); return; }
    if (!server) { setError("Server is required."); return; }

    setLoading(true);
    setError('');

    try {
      let result;
      try {
        const resStr = await invoke('auth_mt5', {
          account: account.toString(),
          password: password,
          server: server,
          savePwd: savePassword
        });
        result = JSON.parse(resStr);
      } catch (invokeErr) {
        // Fallback for browser testing
        console.warn("Tauri invoke failed (maybe running in browser fallback?):", invokeErr);
        result = { error: "Tauri backend not reachable. Run via Tauri wrapper." };
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
        
        onLogin(sessionToken);
      } else {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        
        const errStr = result.error || "Invalid credentials.";
        if (newAttempts >= 5) {
          setLocked(true);
          setCountdown(60);
          setError(`Too many failed attempts. Locked for 60 seconds.`);
        } else {
          setError(`${errStr} (${5 - newAttempts} attempts remaining)`);
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
            {loading ? 'CONNECTING...' : 'CONNECT & LAUNCH'}
          </button>
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
};

export default Login;