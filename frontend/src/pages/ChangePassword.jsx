import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Loader2, Check, AlertTriangle } from 'lucide-react';
import { api } from '../api';

function ChangePassword({ user }) {
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const isForceChange = user?.force_password_change;

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
    setSuccess('');

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
      await api.post('/api/auth/change-password', {
        current_password: currentPassword,
        new_password: newPassword
      });

      setSuccess('Password changed successfully!');

      // If this was a forced password change, update user data and redirect
      if (isForceChange) {
        const stored = localStorage.getItem('user');
        if (stored) {
          const parsed = JSON.parse(stored);
          parsed.force_password_change = false;
          localStorage.setItem('user', JSON.stringify(parsed));
        }
        setTimeout(() => {
          if (user?.role === 'teacher') navigate('/teacher');
          else if (user?.role === 'admin') navigate('/admin');
          else navigate('/dashboard');
        }, 1500);
      } else {
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err) {
      setError(err.message || 'Failed to change password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card" style={{ maxWidth: '500px' }}>
        <div className="auth-header">
          <div className="title-gradient">CampusAI</div>
          <div className="subtitle-text">
            {isForceChange ? 'Password Change Required' : 'Change Password'}
          </div>
        </div>

        {isForceChange && (
          <div className="alert alert-error" style={{ marginBottom: '20px', backgroundColor: 'rgba(245, 158, 11, 0.1)', borderColor: 'rgba(245, 158, 11, 0.25)', color: '#fbbf24' }}>
            <AlertTriangle size={16} />
            Your administrator requires you to change your password before continuing.
          </div>
        )}

        {success && (
          <div className="alert alert-success">
            <Check size={16} /> {success}
          </div>
        )}
        {error && (
          <div className="alert alert-error">
            <AlertTriangle size={16} /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="change-currentPassword">
              <Lock size={16} /> Current Password
            </label>
            <input
              id="change-currentPassword"
              type="password"
              className="form-control"
              placeholder="Enter current password"
              value={currentPassword}
              onChange={(e) => { setCurrentPassword(e.target.value); setError(''); }}
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="change-newPassword">
              <Lock size={16} /> New Password
            </label>
            <input
              id="change-newPassword"
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
            <label className="form-label" htmlFor="change-confirmPassword">
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
              id="change-confirmPassword"
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
                <Loader2 className="animate-spin" size={18} /> Updating...
              </>
            ) : (
              'Change Password'
            )}
          </button>
        </form>

        {!isForceChange && (
          <div className="auth-switch" style={{ marginTop: '20px' }}>
            <button
              onClick={() => navigate(-1)}
              style={{ background: 'none', border: 'none', color: '#06b6d4', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.9rem', fontWeight: '600' }}
            >
              ← Go Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default ChangePassword;
