// App.jsx - Main application shell
// Handles authentication state and renders Login or Dashboard

import { useState, useEffect } from 'react';
import Login from './Login.jsx';
import Dashboard from './Dashboard.jsx';
import './styles.css';

const App = () => {
  const [sessionToken, setSessionToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check session on mount
  useEffect(() => {
    const token = sessionStorage.getItem('session_token');
    const sessionTime = sessionStorage.getItem('session_time');
    
    if (token && sessionTime) {
      // Check if session expired (8 hours)
      const sessionAge = Date.now() - parseInt(sessionTime);
      const eightHours = 8 * 60 * 60 * 1000;
      
      if (sessionAge < eightHours) {
        setSessionToken(token);
      } else {
        // Session expired
        sessionStorage.removeItem('session_token');
        sessionStorage.removeItem('session_time');
      }
    }
    
    setLoading(false);
  }, []);

  const handleLogin = (token) => {
    setSessionToken(token);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('session_token');
    sessionStorage.removeItem('session_time');
    setSessionToken(null);
  };

  // Loading state
  if (loading) {
    return (
      <div style={styles.loading}>
        <div>Loading...</div>
      </div>
    );
  }

  // Render based on authentication state
  return sessionToken ? (
    <Dashboard sessionToken={sessionToken} onLogout={handleLogout} />
  ) : (
    <Login onLogin={handleLogin} />
  );
};

const styles = {
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    background: '#000000',
    color: '#00c8f0',
    fontFamily: "'JetBrains Mono', monospace",
  },
};

export default App;