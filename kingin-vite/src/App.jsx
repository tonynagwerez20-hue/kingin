// App.jsx - Main application shell
// Handles authentication state and renders Login or KingIn Dashboard

import { useState, useEffect } from 'react';
import Login from './Login.jsx';
import KingInDashboard from './KingInDashboard.jsx';
import SetupWizard from './SetupWizard.jsx';
import api from './api.js';
import './kingin.css';

const App = () => {
  const [sessionToken, setSessionToken] = useState(null);
  const [isConfigured, setIsConfigured] = useState(true);
  const [loading, setLoading] = useState(true);

  // Check session and system status on mount
  useEffect(() => {
    const checkStatus = async () => {
      try {
        // 1. Check if configured
        const statusRes = await fetch('/api/system/status');
        const status = await statusRes.json();
        setIsConfigured(status.configured);

        // 2. Check if logged in
        const token = localStorage.getItem('kingin_jwt');
        if (token) {
          setSessionToken(token);
        }
      } catch (err) {
        console.error("Initialization error:", err);
      } finally {
        setLoading(false);
      }
    };
    
    checkStatus();
  }, []);

  const handleLogin = (token) => {
    setSessionToken(token);
  };

  const handleLogout = () => {
    localStorage.removeItem('kingin_jwt');
    setSessionToken(null);
  };

  const handleSetupComplete = () => {
    setIsConfigured(true);
  };

  // Loading state
  if (loading) {
    return (
      <div style={styles.loading}>
        <div>INITIALIZING KINGIN...</div>
      </div>
    );
  }

  // First-run experience
  if (!isConfigured) {
    return <SetupWizard onComplete={handleSetupComplete} />;
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