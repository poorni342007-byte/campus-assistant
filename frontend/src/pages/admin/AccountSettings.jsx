import React, { useState } from 'react';
import { Lock, Loader2, Check, AlertTriangle } from 'lucide-react';
import { api } from '../../api';

function AccountSettings({ user }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (!/[A-Z]/.test(newPassword)) { setError('Password needs at least 1 uppercase letter.'); return; }
    if (!/[0-9]/.test(newPassword)) { setError('Password needs at least 1 number.'); return; }
    if (newPassword !== confirmPassword) { setError('Passwords do not match.'); return; }

    setLoading(true);
    try {
      await api.post('/api/auth/change-password', { current_password: currentPassword, new_password: newPassword });
      setSuccess('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err.message || 'Failed to change password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '550px' }}>
      <div className="info-card" style={{ maxWidth: 'none', padding: '30px' }}>
        <h3 style={{ fontSize: '1.25rem', color: '#ffffff', marginBottom: '25px' }}>
          <Lock size={18} style={{ marginRight: '8px', color: '#a78bfa' }} />
          Change Password
        </h3>

        {success && <div className="alert alert-success"><Check size={14} /> {success}</div>}
        {error && <div className="alert alert-error"><AlertTriangle size={14} /> {error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label"><Lock size={14} /> Current Password</label>
            <input type="password" className="form-control" placeholder="Current password" required
              value={currentPassword} onChange={(e) => { setCurrentPassword(e.target.value); setError(''); }} disabled={loading} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label"><Lock size={14} /> New Password</label>
            <input type="password" className="form-control" placeholder="Min. 8 chars, 1 uppercase, 1 number" required
              value={newPassword} onChange={(e) => { setNewPassword(e.target.value); setError(''); }} disabled={loading} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label"><Lock size={14} /> Confirm New Password</label>
            <input type="password" className="form-control" placeholder="Re-enter new password" required
              value={confirmPassword} onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }} disabled={loading} />
          </div>
          <button type="submit" className="btn" disabled={loading}>
            {loading ? <><Loader2 className="animate-spin" size={16} /> Saving...</> : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default AccountSettings;
