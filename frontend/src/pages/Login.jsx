import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Mail, Lock, Loader2, AlertTriangle, Sparkles } from 'lucide-react';
import { api } from '../api';

function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('demo') === 'true') {
      setEmail('admin@campus.edu');
      setPassword('adminpassword123');
      setIsDemoMode(true);
    }
  }, [location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await api.post('/api/login', { email, password });

      // Store token and user data
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      onLoginSuccess(data.user);

      // Check force password change (for teachers)
      if (data.user.force_password_change) {
        navigate('/change-password');
        return;
      }

      // Route by role
      if (data.user.role === 'admin') {
        navigate('/admin');
      } else if (data.user.role === 'teacher') {
        navigate('/teacher');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-split-container">
      {/* Decorative Background Blobs */}
      <div className="landing-bg-blobs">
        <div className="landing-blob landing-blob-1"></div>
        <div className="landing-blob landing-blob-2"></div>
        <div className="landing-blob landing-blob-3"></div>
      </div>

      {/* Left Panel: Hero visual matching demo layout (without the pill badge) */}
      <div className="auth-hero-panel">
        <h1 className="hero-main-title">
          <span>Your Academic</span>
          <span className="hero-title-gradient">Intelligence</span>
          <span>Platform</span>
        </h1>
        <p className="hero-description">
          CampusAI combines AI-powered insights, smart scheduling, and real-time 
          analytics to transform how you learn, plan, and perform.
        </p>
      </div>

      {/* Right Panel: Login Form Card */}
      <div className="auth-form-panel">
        <div className="auth-card">
          <div className="auth-header">
            <div className="title-gradient">CampusAI</div>
            <div className="subtitle-text">Smart College Assistant</div>
          </div>

          <div className="tabs-toggle">
            <button className="tab-btn active">
              <Lock size={14} style={{ marginRight: '6px' }} /> Login
            </button>
            <button className="tab-btn" onClick={() => navigate('/register')}>
              <Mail size={14} style={{ marginRight: '6px' }} /> Register
            </button>
          </div>

          <h2>Login to your Account</h2>

          {isDemoMode && (
            <div className="alert alert-success" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '6px', fontSize: '0.85rem', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold' }}>
                <Sparkles size={16} /> Live Demo Mode Enabled
              </div>
              <div>Pre-filled default admin credentials. Click "Sign In" below to log in as admin.</div>
            </div>
          )}

          {error && (
            <div className="alert alert-error" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={16} /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="login-email">
                <Mail size={16} /> Email Address
              </label>
              <input
                id="login-email"
                type="email"
                className="form-control"
                placeholder="e.g., alex@college.edu"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="login-password">
                <Lock size={16} /> Password
              </label>
              <input
                id="login-password"
                type="password"
                className="form-control"
                placeholder="Enter password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                required
                disabled={loading}
              />
              <div style={{ textAlign: 'right', marginTop: '8px' }}>
                <Link to="/forgot-password" style={{ color: '#94a3b8', fontSize: '0.85rem', textDecoration: 'none' }}>
                  Forgot password?
                </Link>
              </div>
            </div>

            <button type="submit" className="btn" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={18} /> Signing In...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className="auth-switch">
            Don't have an account?
            <Link to="/register" className="auth-link">Sign Up</Link>
          </div>
          <div style={{ textAlign: 'center', marginTop: '8px', fontSize: '0.8rem', color: '#64748b' }}>
            Teacher accounts are created by your administrator.
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
