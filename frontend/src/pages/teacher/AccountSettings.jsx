import React, { useState, useEffect } from 'react';
import { Lock, Loader2, Check, AlertTriangle, User, Mail, Shield, BookOpen } from 'lucide-react';
import { api } from '../../api';

function AccountSettings({ user }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [subjects, setSubjects] = useState([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);

  useEffect(() => {
    const fetchTeacherSubjects = async () => {
      setLoadingSubjects(true);
      try {
        const data = await api.get('/api/teacher/subjects');
        setSubjects(data);
      } catch (err) {
        console.error("Failed to load teacher subjects", err);
      } finally {
        setLoadingSubjects(false);
      }
    };
    fetchTeacherSubjects();
  }, []);

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
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '30px', maxWidth: '1000px' }}>
      
      {/* Profile Details Panel (View-Only) */}
      <div className="info-card" style={{ padding: '25px', height: 'fit-content' }}>
        <h3 style={{ fontSize: '1.25rem', color: '#ffffff', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <User size={18} style={{ color: '#06b6d4' }} /> Profile Information
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ padding: '12px 16px', borderRadius: '10px', backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <User size={14} style={{ color: '#94a3b8' }} />
              <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '700' }}>Full Name</span>
            </div>
            <div style={{ color: '#ffffff', fontWeight: '500' }}>{user?.full_name}</div>
          </div>

          <div style={{ padding: '12px 16px', borderRadius: '10px', backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <Mail size={14} style={{ color: '#94a3b8' }} />
              <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '700' }}>Email Address</span>
            </div>
            <div style={{ color: '#ffffff', fontWeight: '500' }}>{user?.email}</div>
          </div>

          <div style={{ padding: '12px 16px', borderRadius: '10px', backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <Shield size={14} style={{ color: '#94a3b8' }} />
              <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '700' }}>Department</span>
            </div>
            <div style={{ color: '#06b6d4', fontWeight: '600' }}>{user?.department || 'Not Assigned'}</div>
          </div>

          <div style={{ padding: '12px 16px', borderRadius: '10px', backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <BookOpen size={14} style={{ color: '#94a3b8' }} />
              <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '700' }}>Assigned Subjects</span>
            </div>
            
            {loadingSubjects ? (
              <Loader2 className="animate-spin" size={16} style={{ color: '#06b6d4' }} />
            ) : subjects.length === 0 ? (
              <div style={{ color: '#64748b', fontSize: '0.85rem' }}>No subjects assigned.</div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {subjects.map(sub => (
                  <span key={sub.id} style={{ fontSize: '0.8rem', padding: '3px 8px', borderRadius: '6px', backgroundColor: 'rgba(167, 139, 250, 0.1)', color: '#a78bfa', border: '1px solid rgba(167, 139, 250, 0.2)', fontWeight: '500' }}>
                    {sub.subject_name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Change Password Form */}
      <div className="info-card" style={{ padding: '25px', height: 'fit-content' }}>
        <h3 style={{ fontSize: '1.25rem', color: '#ffffff', marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Lock size={18} style={{ color: '#a78bfa' }} /> Change Password
        </h3>

        {success && <div className="alert alert-success" style={{ marginBottom: '15px' }}><Check size={14} /> {success}</div>}
        {error && <div className="alert alert-error" style={{ marginBottom: '15px' }}><AlertTriangle size={14} /> {error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label"><Lock size={14} /> Current Password</label>
            <input 
              type="password" 
              className="form-control" 
              placeholder="Current password" 
              required
              value={currentPassword} 
              onChange={(e) => { setCurrentPassword(e.target.value); setError(''); }} 
              disabled={loading} 
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label"><Lock size={14} /> New Password</label>
            <input 
              type="password" 
              className="form-control" 
              placeholder="Min. 8 chars, 1 uppercase, 1 number" 
              required
              value={newPassword} 
              onChange={(e) => { setNewPassword(e.target.value); setError(''); }} 
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

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">
              <Lock size={14} /> Confirm New Password
              {confirmPassword && (
                <span style={{ marginLeft: 'auto', fontSize: '0.8rem' }}>
                  {passwordsMatch ? <span style={{ color: '#34d399' }}>✅ Match</span> : <span style={{ color: '#ef4444' }}>❌ Mismatch</span>}
                </span>
              )}
            </label>
            <input 
              type="password" 
              className="form-control" 
              placeholder="Re-enter new password" 
              required
              value={confirmPassword} 
              onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }} 
              disabled={loading} 
            />
          </div>

          <button type="submit" className="btn" disabled={loading} style={{ marginTop: '10px' }}>
            {loading ? <><Loader2 className="animate-spin" size={16} /> Saving...</> : 'Update Password'}
          </button>
        </form>
      </div>

    </div>
  );
}

export default AccountSettings;
