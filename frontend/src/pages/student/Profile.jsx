import React, { useState } from 'react';
import { User, Mail, Hash, Shield, Calendar, Loader2, Check, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../../api';

function Profile({ user }) {
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const handleSave = async (e) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setError('Name cannot be empty.');
      return;
    }
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      await api.put('/api/student/profile', { full_name: fullName.trim() });
      setSuccess('Profile updated successfully.');
      // Update localStorage user data
      const stored = localStorage.getItem('user');
      if (stored) {
        const parsed = JSON.parse(stored);
        parsed.full_name = fullName.trim();
        localStorage.setItem('user', JSON.stringify(parsed));
      }
    } catch (err) {
      setError(err.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const profileFields = [
    { label: 'Email Address', value: user?.email, icon: <Mail size={16} style={{ color: '#06b6d4' }} /> },
    { label: 'Registration Number', value: user?.reg_number || '—', icon: <Hash size={16} style={{ color: '#a78bfa' }} /> },
    { label: 'Role', value: (user?.role || 'student').charAt(0).toUpperCase() + (user?.role || 'student').slice(1), icon: <Shield size={16} style={{ color: '#34d399' }} /> },
    { label: 'Account Created', value: user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—', icon: <Calendar size={16} style={{ color: '#fbbf24' }} /> },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px', maxWidth: '700px', margin: '0 auto' }}>

      {/* Profile Header */}
      <div className="info-card" style={{ maxWidth: 'none', background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(6, 182, 212, 0.05) 100%)', border: '1px solid rgba(6, 182, 212, 0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #6366f1, #06b6d4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.8rem',
            fontWeight: '800',
            color: '#ffffff',
            flexShrink: 0
          }}>
            {(user?.full_name || 'U').charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 style={{ fontSize: '1.5rem', color: '#ffffff' }}>{user?.full_name}</h2>
            <p style={{ color: '#94a3b8', fontSize: '0.95rem', marginTop: '2px' }}>{user?.email}</p>
            {user?.reg_number && (
              <span style={{ fontSize: '0.8rem', color: '#a78bfa', fontWeight: '600' }}>#{user.reg_number}</span>
            )}
          </div>
        </div>
      </div>

      {/* Profile Details */}
      <div className="info-card" style={{ maxWidth: 'none', padding: '25px' }}>
        <h3 style={{ fontSize: '1.2rem', color: '#ffffff', marginBottom: '20px' }}>Account Information</h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {profileFields.map((field, i) => (
            <div key={i} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '14px 18px',
              borderRadius: '12px',
              backgroundColor: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.05)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {field.icon}
                <span style={{ fontSize: '0.85rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.3px' }}>{field.label}</span>
              </div>
              <span style={{ fontSize: '0.95rem', color: '#ffffff', fontWeight: '500' }}>{field.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Edit Name */}
      <div className="info-card" style={{ maxWidth: 'none', padding: '25px' }}>
        <h3 style={{ fontSize: '1.2rem', color: '#ffffff', marginBottom: '20px' }}>Edit Profile</h3>

        {success && <div className="alert alert-success" style={{ marginBottom: '15px' }}><Check size={16} /> {success}</div>}
        {error && <div className="alert alert-error" style={{ marginBottom: '15px' }}>⚠️ {error}</div>}

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">
              <User size={14} /> Full Name
            </label>
            <input
              type="text"
              className="form-control"
              value={fullName}
              onChange={(e) => { setFullName(e.target.value); setError(''); setSuccess(''); }}
              placeholder="Your full name"
              required
            />
          </div>

          <button
            type="submit"
            className="btn"
            disabled={saving || fullName.trim() === user?.full_name}
            style={{ padding: '12px', fontSize: '0.9rem' }}
          >
            {saving ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Loader2 className="animate-spin" size={16} /> Saving...
              </span>
            ) : 'Save Changes'}
          </button>
        </form>
      </div>

      {/* Password Change Link */}
      <div className="info-card" style={{ maxWidth: 'none', padding: '25px' }}>
        <h3 style={{ fontSize: '1.2rem', color: '#ffffff', marginBottom: '10px' }}>Security</h3>
        <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '15px' }}>
          Keep your account secure by updating your password regularly.
        </p>
        <Link
          to="/change-password"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            borderRadius: '10px',
            backgroundColor: 'rgba(99, 102, 241, 0.1)',
            border: '1px solid rgba(99, 102, 241, 0.2)',
            color: '#a78bfa',
            fontWeight: '600',
            fontSize: '0.9rem',
            textDecoration: 'none',
            transition: 'all 0.2s ease'
          }}
        >
          <Lock size={16} /> Change Password
        </Link>
      </div>
    </div>
  );
}

export default Profile;
