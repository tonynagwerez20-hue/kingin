// App.jsx - Main application shell
// Handles authentication state and renders Login or KingIn Dashboard

import { useState, useEffect } from 'react';
import Login from './Login.jsx';
import KingInDashboard from './KingInDashboard.jsx';
import './kingin.css';

const App = () => {
  const [sessionToken, setSessionToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check session on mount
  useEffect(() => {
    // Auto-login for demo purposes
    const demoToken = 'demo_session_' + Date.now();
    sessionStorage.setItem('session_token', demoToken);
    sessionStorage.setItem('session_time', Date.now().toString());
    setSessionToken(demoToken);
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
    <KingInDashboard sessionToken={sessionToken} onLogout={handleLogout} />
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