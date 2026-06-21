import React, { useState, useEffect } from 'react';
import { UserPlus, Trash2, Search, Loader2, AlertTriangle, Check, X } from 'lucide-react';
import { api } from '../../api';

function TeacherManagement({ user }) {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Create teacher form
  const [showCreate, setShowCreate] = useState(false);
  const [newTeacher, setNewTeacher] = useState({ full_name: '', email: '', department: '', temporary_password: '' });
  const [newSubjects, setNewSubjects] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createSuccess, setCreateSuccess] = useState('');

  // Promote student
  const [showPromote, setShowPromote] = useState(false);
  const [promoteSearch, setPromoteSearch] = useState('');
  const [promoteResults, setPromoteResults] = useState([]);
  const [promoteDept, setPromoteDept] = useState('');
  const [promoting, setPromoting] = useState(false);
  const [promoteError, setPromoteError] = useState('');

  const fetchTeachers = async () => {
    setLoading(true);
    try {
      const data = await api.get('/api/admin/teachers');
      setTeachers(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTeachers(); }, []);

  const handleCreateTeacher = async (e) => {
    e.preventDefault();
    setCreateError('');
    setCreateSuccess('');
    setCreating(true);

    try {
      const subjects = newSubjects.split(',').map(s => s.trim()).filter(s => s);
      await api.post('/api/admin/teachers', {
        full_name: newTeacher.full_name,
        email: newTeacher.email,
        department: newTeacher.department,
        temporary_password: newTeacher.temporary_password,
        subjects: subjects
      });
      setCreateSuccess('Teacher account created successfully!');
      setNewTeacher({ full_name: '', email: '', department: '', temporary_password: '' });
      setNewSubjects('');
      fetchTeachers();
    } catch (err) {
      setCreateError(err.message || 'Failed to create teacher.');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteTeacher = async (teacherId) => {
    if (!confirm('Are you sure you want to delete this teacher?')) return;
    try {
      await api.delete(`/api/admin/teachers/${teacherId}`);
      setTeachers(prev => prev.filter(t => t.id !== teacherId));
    } catch (err) {
      alert(err.message || 'Failed to delete teacher.');
    }
  };

  const handleSearchStudents = async () => {
    if (!promoteSearch.trim()) return;
    try {
      const data = await api.get('/api/admin/students');
      const filtered = data.filter(s =>
        s.full_name?.toLowerCase().includes(promoteSearch.toLowerCase()) ||
        s.email?.toLowerCase().includes(promoteSearch.toLowerCase())
      );
      setPromoteResults(filtered.slice(0, 10));
    } catch (err) {
      setPromoteError(err.message);
    }
  };

  const handlePromote = async (studentId) => {
    if (!promoteDept.trim()) {
      setPromoteError('Department is required for promotion.');
      return;
    }
    setPromoting(true);
    setPromoteError('');
    try {
      await api.post('/api/admin/promote', {
        student_id: studentId,
        department: promoteDept
      });
      setShowPromote(false);
      setPromoteSearch('');
      setPromoteResults([]);
      setPromoteDept('');
      fetchTeachers();
    } catch (err) {
      setPromoteError(err.message || 'Failed to promote student.');
    } finally {
      setPromoting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
        <Loader2 className="animate-spin" size={36} style={{ color: '#06b6d4' }} />
        <span style={{ marginLeft: '12px', color: '#94a3b8' }}>Loading Teachers...</span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <button onClick={() => setShowCreate(!showCreate)} className="btn" style={{ width: 'auto', padding: '12px 20px', fontSize: '0.85rem' }}>
          <UserPlus size={16} /> Create Teacher Account
        </button>
        <button
          onClick={() => setShowPromote(!showPromote)}
          style={{
            padding: '12px 20px', borderRadius: '12px', border: '1px solid rgba(6,182,212,0.3)',
            background: 'rgba(6,182,212,0.08)', color: '#06b6d4', cursor: 'pointer', fontFamily: 'inherit',
            fontWeight: '600', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px'
          }}
        >
          <Search size={16} /> Promote Student to Teacher
        </button>
      </div>

      {/* Create Teacher Form */}
      {showCreate && (
        <div className="info-card" style={{ maxWidth: 'none', padding: '25px' }}>
          <h3 style={{ fontSize: '1.15rem', color: '#ffffff', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            Create New Teacher Account
            <button onClick={() => setShowCreate(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={18} /></button>
          </h3>

          {createError && <div className="alert alert-error"><AlertTriangle size={14} /> {createError}</div>}
          {createSuccess && <div className="alert alert-success"><Check size={14} /> {createSuccess}</div>}

          <form onSubmit={handleCreateTeacher} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '0.75rem' }}>Full Name</label>
              <input type="text" className="form-control" placeholder="Teacher Name" required
                value={newTeacher.full_name} onChange={(e) => setNewTeacher({ ...newTeacher, full_name: e.target.value })} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '0.75rem' }}>Email</label>
              <input type="email" className="form-control" placeholder="teacher@institution.edu" required
                value={newTeacher.email} onChange={(e) => setNewTeacher({ ...newTeacher, email: e.target.value })} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '0.75rem' }}>Department</label>
              <input type="text" className="form-control" placeholder="e.g., Computer Science"
                value={newTeacher.department} onChange={(e) => setNewTeacher({ ...newTeacher, department: e.target.value })} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '0.75rem' }}>Temporary Password</label>
              <input type="text" className="form-control" placeholder="TempPass123" required
                value={newTeacher.temporary_password} onChange={(e) => setNewTeacher({ ...newTeacher, temporary_password: e.target.value })} />
            </div>
            <div className="form-group" style={{ marginBottom: 0, gridColumn: 'span 2' }}>
              <label className="form-label" style={{ fontSize: '0.75rem' }}>Subjects (comma-separated)</label>
              <input type="text" className="form-control" placeholder="e.g., Mathematics, Physics, Chemistry"
                value={newSubjects} onChange={(e) => setNewSubjects(e.target.value)} />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <button type="submit" className="btn" style={{ fontSize: '0.9rem' }} disabled={creating}>
                {creating ? <><Loader2 className="animate-spin" size={16} /> Creating...</> : 'Create Teacher Account'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Promote Student Panel */}
      {showPromote && (
        <div className="info-card" style={{ maxWidth: 'none', padding: '25px' }}>
          <h3 style={{ fontSize: '1.15rem', color: '#ffffff', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            Promote Student to Teacher
            <button onClick={() => setShowPromote(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={18} /></button>
          </h3>

          {promoteError && <div className="alert alert-error"><AlertTriangle size={14} /> {promoteError}</div>}

          <div style={{ display: 'flex', gap: '12px', marginBottom: '15px' }}>
            <input type="text" className="form-control" placeholder="Search student by name or email..."
              value={promoteSearch} onChange={(e) => setPromoteSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearchStudents()} />
            <button onClick={handleSearchStudents} className="btn" style={{ width: '120px', fontSize: '0.85rem' }}>Search</button>
          </div>

          <div className="form-group" style={{ marginBottom: '15px' }}>
            <label className="form-label" style={{ fontSize: '0.75rem' }}>Assign Department</label>
            <input type="text" className="form-control" placeholder="e.g., Computer Science"
              value={promoteDept} onChange={(e) => setPromoteDept(e.target.value)} />
          </div>

          {promoteResults.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {promoteResults.map(s => (
                <div key={s.id} style={{
                  padding: '12px 16px', borderRadius: '10px', backgroundColor: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                  <div>
                    <div style={{ color: '#ffffff', fontWeight: '600' }}>{s.full_name}</div>
                    <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>{s.email}</div>
                  </div>
                  <button onClick={() => handlePromote(s.id)} disabled={promoting}
                    style={{
                      padding: '8px 16px', borderRadius: '8px', border: '1px solid rgba(6,182,212,0.3)',
                      background: 'rgba(6,182,212,0.1)', color: '#06b6d4', cursor: 'pointer', fontFamily: 'inherit',
                      fontWeight: '600', fontSize: '0.8rem'
                    }}>
                    Promote
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Teacher Table */}
      <div className="info-card" style={{ maxWidth: 'none', padding: '0', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                <th style={{ padding: '14px 16px', textAlign: 'left', color: '#94a3b8', fontWeight: '600' }}>Name</th>
                <th style={{ padding: '14px 16px', textAlign: 'left', color: '#94a3b8', fontWeight: '600' }}>Email</th>
                <th style={{ padding: '14px 16px', textAlign: 'left', color: '#94a3b8', fontWeight: '600' }}>Department</th>
                <th style={{ padding: '14px 16px', textAlign: 'left', color: '#94a3b8', fontWeight: '600' }}>Subjects</th>
                <th style={{ padding: '14px 16px', textAlign: 'center', color: '#94a3b8', fontWeight: '600' }}>Status</th>
                <th style={{ padding: '14px 16px', textAlign: 'center', color: '#94a3b8', fontWeight: '600' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {teachers.map(t => (
                <tr key={t.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <td style={{ padding: '12px 16px', color: '#ffffff', fontWeight: '500' }}>{t.full_name}</td>
                  <td style={{ padding: '12px 16px', color: '#94a3b8' }}>{t.email}</td>
                  <td style={{ padding: '12px 16px', color: '#a78bfa', fontWeight: '500' }}>{t.department || '—'}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {(t.subjects || []).map((sub, i) => (
                        <span key={i} style={{
                          fontSize: '0.7rem', padding: '2px 8px', borderRadius: '6px',
                          backgroundColor: 'rgba(6,182,212,0.1)', color: '#06b6d4', border: '1px solid rgba(6,182,212,0.15)'
                        }}>
                          {sub}
                        </span>
                      ))}
                      {(!t.subjects || t.subjects.length === 0) && <span style={{ color: '#64748b', fontSize: '0.85rem' }}>None assigned</span>}
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <span style={{
                      fontSize: '0.75rem', fontWeight: '700', padding: '3px 10px', borderRadius: '12px',
                      backgroundColor: t.force_password_change ? 'rgba(245,158,11,0.12)' : 'rgba(16,185,129,0.12)',
                      color: t.force_password_change ? '#fbbf24' : '#34d399',
                      border: `1px solid ${t.force_password_change ? 'rgba(245,158,11,0.2)' : 'rgba(16,185,129,0.2)'}`
                    }}>
                      {t.force_password_change ? 'Pending Change' : 'Active'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <button onClick={() => handleDeleteTeacher(t.id)} style={{
                      background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px'
                    }}>
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {teachers.length === 0 && (
          <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>No teacher accounts found. Create one above.</div>
        )}
      </div>

      {error && <div className="alert alert-error">⚠️ {error}</div>}
    </div>
  );
}

export default TeacherManagement;
