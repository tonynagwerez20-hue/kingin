// Login.jsx - Authentication page
// First launch login with SHA-256 password hashing

import { useState, useEffect } from 'react';
import BrandLogo from './BrandLogo.jsx';

const Login = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [locked, setLocked] = useState(false);
  const [lockCount, setLockCount] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [countdown, setCountdown] = useState(0);

  // SHA-256 hash function (simplified for browser)
  const sha256 = async (message) => {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  // Check for stored credentials on mount
  useEffect(() => {
    const stored = localStorage.getItem('auth_data');
    if (!stored) {
      // First run - create default credentials
      localStorage.setItem('auth_data', JSON.stringify({
        username: 'admin',
        password_hash: '8c6976e5b5410415bbfd40934c882b5ad3f299ab67fc3f5276285b3c2ee9c2d3e' // admin
      }));
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

    setLoading(true);
    setError('');

    try {
      // Hash password
      const passwordHash = await sha256(password);
      
      // Get stored credentials
      const stored = JSON.parse(localStorage.getItem('auth_data') || '{}');
      
      // Verify
      if (username === stored.username && passwordHash === stored.password_hash) {
        // Generate session token
        const sessionToken = await sha256(Date.now().toString() + username);
        sessionStorage.setItem('session_token', sessionToken);
        sessionStorage.setItem('session_time', Date.now().toString());
        
        onLogin(sessionToken);
      } else {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        
        if (newAttempts >= 5) {
          setLocked(true);
          setCountdown(60);
          setError('Too many failed attempts. Locked for 60 seconds.');
        } else {
          setError(`Invalid credentials. ${5 - newAttempts} attempts remaining.`);
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
        <p style={styles.tagline}>Secure. Intelligent. Institutional.</p>
        
        <form onSubmit={handleLogin} style={styles.form}>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={styles.input}
            disabled={locked}
          />
          
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input}
            disabled={locked}
          />
          
          {error && <p style={styles.error}>{error}</p>}
          
          <button 
            type="submit" 
            style={styles.button}
            disabled={loading || locked}
          >
            {loading ? 'LOGGING IN...' : 'LOGIN'}
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
    padding: '60px 80px',
    background: '#0a0a0a',
    borderRadius: '8px',
    border: '1px solid #1a1a1a',
    boxShadow: '0 4px 24px rgba(0, 200, 240, 0.1)',
  },
  title: {
    margin: '24px 0 8px',
    fontFamily: "'Syne', sans-serif",
    fontWeight: '800',
    fontSize: '24px',
    color: '#00c8f0',
    letterSpacing: '4px',
  },
  tagline: {
    margin: '0 0 32px',
    fontSize: '10px',
    color: '#445566',
    letterSpacing: '1px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    width: '240px',
  },
  input: {
    padding: '12px 16px',
    background: '#0a0a0a',
    border: '1px solid #1a1a1a',
    borderRadius: '4px',
    color: '#e8f0f8',
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '14px',
    outline: 'none',
  },
  error: {
    color: '#ff2d4e',
    fontSize: '12px',
    textAlign: 'center',
    margin: '0',
  },
  button: {
    padding: '12px 32px',
    background: 'transparent',
    border: '2px solid #00e87a',
    borderRadius: '24px',
    color: '#00e87a',
    fontFamily: "'Syne', sans-serif",
    fontWeight: '700',
    fontSize: '14px',
    letterSpacing: '2px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
};

export default Login;