import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Mail, Lock, Hash, Loader2, Check, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { api } from '../api';

function Register() {
  const [fullName, setFullName] = useState('');
  const [regNumber, setRegNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [emailValid, setEmailValid] = useState(null); // null = not checked, true/false
  const navigate = useNavigate();

  const allowedDomains = ['edu', 'edu.in', 'sairamtap.edu.in'];

  const checkEmailDomain = (emailStr) => {
    if (!emailStr || !emailStr.includes('@')) {
      setEmailValid(null);
      return;
    }
    const domain = emailStr.split('@')[1]?.toLowerCase();
    if (!domain) {
      setEmailValid(false);
      return;
    }
    const isValid = allowedDomains.some(d => domain === d || domain.endsWith('.' + d));
    setEmailValid(isValid);
  };

  const getPasswordStrength = () => {
    if (!password) return { level: 0, label: '', color: '' };
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 1) return { level: 1, label: 'Weak', color: '#ef4444' };
    if (score === 2) return { level: 2, label: 'Medium', color: '#f59e0b' };
    if (score >= 3) return { level: 3, label: 'Strong', color: '#10b981' };
    return { level: 0, label: '', color: '' };
  };

  const passwordStrength = getPasswordStrength();
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    // Client-side validations
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      setLoading(false);
      return;
    }
    if (!/[A-Z]/.test(password)) {
      setError('Password must contain at least 1 uppercase letter.');
      setLoading(false);
      return;
    }
    if (!/[0-9]/.test(password)) {
      setError('Password must contain at least 1 number.');
      setLoading(false);
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      setLoading(false);
      return;
    }
    if (!regNumber.trim()) {
      setError('Registration number is required.');
      setLoading(false);
      return;
    }

    try {
      const data = await api.post('/api/register', {
        full_name: fullName,
        email: email,
        password: password,
        reg_number: regNumber.trim(),
      });

      setSuccess(data.message || 'Registration successful! You can now log in.');
      setFullName('');
      setRegNumber('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setEmailValid(null);

      // Redirect to login after 2 seconds
      setTimeout(() => navigate('/login'), 2000);
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

      {/* Right Panel: Register Form Card */}
      <div className="auth-form-panel">
        <div className="auth-card">
          <div className="auth-header">
            <div className="title-gradient">CampusAI</div>
            <div className="subtitle-text">Smart College Assistant</div>
          </div>

          <div className="tabs-toggle">
            <button className="tab-btn" onClick={() => navigate('/login')}>
              <Lock size={14} style={{ marginRight: '6px' }} /> Login
            </button>
            <button className="tab-btn active">
              <Mail size={14} style={{ marginRight: '6px' }} /> Register
            </button>
          </div>

          <h2>Create a Student Account</h2>

          {error && (
            <div className="alert alert-error">
              <AlertTriangle size={16} /> {error}
            </div>
          )}
          {success && (
            <div className="alert alert-success">
              <Check size={16} /> {success}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="reg-fullName">
                <User size={16} /> Full Name
              </label>
              <input
                id="reg-fullName"
                type="text"
                className="form-control"
                placeholder="e.g., Alex Johnson"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="reg-regNumber">
                <Hash size={16} /> Registration Number
              </label>
              <input
                id="reg-regNumber"
                type="text"
                className="form-control"
                placeholder="e.g., SIT24CO035"
                value={regNumber}
                onChange={(e) => setRegNumber(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="reg-email">
                <Mail size={16} /> Email Address
                {emailValid !== null && (
                  <span style={{ marginLeft: 'auto', fontSize: '0.85rem', fontWeight: '600' }}>
                    {emailValid ? (
                      <span style={{ color: '#34d399' }}>✅ Valid domain</span>
                    ) : (
                      <span style={{ color: '#ef4444' }}>❌ Invalid domain</span>
                    )}
                  </span>
                )}
              </label>
              <input
                id="reg-email"
                type="email"
                className="form-control"
                placeholder="e.g., alex@college.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={(e) => checkEmailDomain(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="reg-password">
                <Lock size={16} /> Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  className="form-control"
                  placeholder="Min. 8 chars, 1 uppercase, 1 number"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  style={{ paddingRight: '40px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    padding: '4px'
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {/* Password Strength Bar */}
              {password && (
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
              <label className="form-label" htmlFor="reg-confirmPassword">
                <Lock size={16} /> Confirm Password
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
                id="reg-confirmPassword"
                type="password"
                className="form-control"
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <button type="submit" className="btn" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={18} /> Registering...
                </>
              ) : (
                'Sign Up'
              )}
            </button>
          </form>

          <div className="auth-switch">
            Already have an account?
            <Link to="/login" className="auth-link">Login</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Register;
