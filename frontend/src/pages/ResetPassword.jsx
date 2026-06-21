import React, { useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { Lock, Loader2, Check, AlertTriangle, ArrowLeft } from 'lucide-react';
import { api } from '../api';

function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const getPasswordStrength = () => {
    if (!newPassword) return { level: 0, label: '', color: '' };
    let score = 0;
    if (newPassword.length >= 8) score++;
    if (/[A-Z]/.test(newPassword)) score++;
    if (/[0-9]/.test(newPassword)) score++;
    if (/[^A-Za-z0-9]/.test(newPassword)) score++;

    if (score <= 1) return { level: 1, label: 'Weak', color: '#ef4444' };
    if (score === 2) return { level: 2, label: 'Medium', color: '#f59e0b' };
    if (score >= 3) return { level: 3, label: 'Strong', color: '#10b981' };
    return { level: 0, label: '', color: '' };
  };

  const passwordStrength = getPasswordStrength();
  const passwordsMatch = confirmPassword.length > 0 && newPassword === confirmPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (!/[A-Z]/.test(newPassword)) {
      setError('Password must contain at least 1 uppercase letter.');
      return;
    }
    if (!/[0-9]/.test(newPassword)) {
      setError('Password must contain at least 1 number.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/api/auth/reset-password', {
        token: token,
        new_password: newPassword
      });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(err.message || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="auth-card">
        <div className="auth-header">
          <div className="title-gradient">CampusAI</div>
          <div className="subtitle-text">Password Reset</div>
        </div>
        <div className="alert alert-error">
          <AlertTriangle size={16} /> Invalid or missing reset token. Please request a new password reset link.
        </div>
        <Link to="/forgot-password" className="auth-link" style={{ display: 'block', textAlign: 'center', marginTop: '15px' }}>
          Request New Link
        </Link>
      </div>
    );
  }

  return (
    <div className="auth-card">
      <div className="auth-header">
        <div className="title-gradient">CampusAI</div>
        <div className="subtitle-text">Set New Password</div>
      </div>

      {success ? (
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
          <h2 style={{ fontSize: '1.3rem', marginBottom: '12px' }}>Password Reset Successful</h2>
          <p style={{ color: '#94a3b8', fontSize: '0.95rem', marginBottom: '25px' }}>
            Your password has been updated. Redirecting to login...
          </p>
        </div>
      ) : (
        <>
          <h2>Reset Your Password</h2>

          {error && (
            <div className="alert alert-error">
              <AlertTriangle size={16} /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="reset-newPassword">
                <Lock size={16} /> New Password
              </label>
              <input
                id="reset-newPassword"
                type="password"
                className="form-control"
                placeholder="Min. 8 chars, 1 uppercase, 1 number"
                value={newPassword}
                onChange={(e) => { setNewPassword(e.target.value); setError(''); }}
                required
                disabled={loading}
              />
              {newPassword && (
                <div style={{ marginTop: '8px' }}>
                  <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                    {[1, 2, 3].map(level => (
                      <div key={level} style={{
                        flex: 1,
                        height: '4px',
                        borderRadius: '2px',
                        backgroundColor: passwordStrength.level >= level ? passwordStrength.color : 'rgba(255,255,255,0.05)',
                        transition: 'all 0.3s ease'
                      }} />
                    ))}
                  </div>
                  <span style={{ fontSize: '0.75rem', color: passwordStrength.color, fontWeight: '600' }}>{passwordStrength.label}</span>
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="reset-confirmPassword">
                <Lock size={16} /> Confirm New Password
                {confirmPassword && (
                  <span style={{ marginLeft: 'auto', fontSize: '0.85rem' }}>
                    {passwordsMatch ? (
                      <span style={{ color: '#34d399' }}>✅ Match</span>
                    ) : (
                      <span style={{ color: '#ef4444' }}>❌ Mismatch</span>
                    )}
                  </span>
                )}
              </label>
              <input
                id="reset-confirmPassword"
                type="password"
                className="form-control"
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
                required
                disabled={loading}
              />
            </div>

            <button type="submit" className="btn" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={18} /> Resetting...
                </>
              ) : (
                'Reset Password'
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

export default ResetPassword;
