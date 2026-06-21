import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Loader2, Check, ArrowLeft } from 'lucide-react';
import { api } from '../api';

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/api/auth/forgot-password', { email });
    } catch (err) {
      // Silently ignore — always show success
    } finally {
      setLoading(false);
      setSubmitted(true);
    }
  };

  return (
    <div className="auth-card">
      <div className="auth-header">
        <div className="title-gradient">CampusAI</div>
        <div className="subtitle-text">Password Recovery</div>
      </div>

      {submitted ? (
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px'
          }}>
            <Check size={28} style={{ color: '#34d399' }} />
          </div>
          <h2 style={{ fontSize: '1.3rem', marginBottom: '12px' }}>Check Your Email</h2>
          <p style={{ color: '#94a3b8', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '25px' }}>
            If an account exists with that email, a password reset link has been generated. Check your email inbox or server logs.
          </p>
          <Link to="/login" className="auth-link" style={{ fontSize: '0.95rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <ArrowLeft size={16} /> Back to Login
          </Link>
        </div>
      ) : (
        <>
          <h2>Forgot Password</h2>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', textAlign: 'center', marginBottom: '25px' }}>
            Enter the email associated with your account and we'll send you a reset link.
          </p>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="forgot-email">
                <Mail size={16} /> Email Address
              </label>
              <input
                id="forgot-email"
                type="email"
                className="form-control"
                placeholder="e.g., alex@college.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <button type="submit" className="btn" disabled={loading || !email.trim()}>
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={18} /> Sending...
                </>
              ) : (
                'Send Reset Link'
              )}
            </button>
          </form>

          <div className="auth-switch" style={{ marginTop: '20px' }}>
            <Link to="/login" className="auth-link" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <ArrowLeft size={14} /> Back to Login
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

export default ForgotPassword;
