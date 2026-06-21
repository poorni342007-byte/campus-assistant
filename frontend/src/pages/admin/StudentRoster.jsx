import React, { useState, useEffect } from 'react';
import { Search, Download, Trash2, X, Loader2, AlertTriangle } from 'lucide-react';
import { api } from '../../api';

function StudentRoster({ user }) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState('All');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState('');
  const [showBulkDelete, setShowBulkDelete] = useState(false);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const data = await api.get('/api/admin/students');
      setStudents(data);
    } catch (err) {
      setError(err.message || 'Failed to load students.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStudents(); }, []);

  const filteredStudents = students.filter(s => {
    const matchesSearch = searchQuery === '' ||
      s.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.reg_number?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRisk = riskFilter === 'All' || s.risk_status === riskFilter;
    return matchesSearch && matchesRisk;
  });

  const handleExportCSV = () => {
    const headers = ['Name', 'Email', 'Reg Number', 'CGPA', 'Attendance %', 'Risk Status'];
    const rows = filteredStudents.map(s => [
      s.full_name, s.email, s.reg_number || '', s.cgpa || '', s.attendance_percentage || '', s.risk_status || ''
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'student_roster.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDeleteStudent = async (studentId) => {
    if (!confirm('Are you sure you want to delete this student?')) return;
    try {
      await api.delete(`/api/admin/students/${studentId}`);
      setStudents(prev => prev.filter(s => s.id !== studentId));
      setSelectedStudent(null);
    } catch (err) {
      alert(err.message || 'Failed to delete student.');
    }
  };

  const handleBulkDelete = async () => {
    if (bulkDeleteConfirm !== 'I understand this is irreversible') return;
    try {
      for (const id of selectedIds) {
        await api.delete(`/api/admin/students/${id}`);
      }
      setStudents(prev => prev.filter(s => !selectedIds.includes(s.id)));
      setSelectedIds([]);
      setShowBulkDelete(false);
      setBulkDeleteConfirm('');
    } catch (err) {
      alert(err.message || 'Failed to delete students.');
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const getRiskBadgeStyle = (risk) => {
    if (risk === 'Stable') return { bg: 'rgba(16,185,129,0.12)', color: '#34d399', border: 'rgba(16,185,129,0.2)' };
    if (risk === 'Warning') return { bg: 'rgba(245,158,11,0.12)', color: '#fbbf24', border: 'rgba(245,158,11,0.2)' };
    return { bg: 'rgba(239,68,68,0.12)', color: '#f87171', border: 'rgba(239,68,68,0.2)' };
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
        <Loader2 className="animate-spin" size={36} style={{ color: '#06b6d4' }} />
        <span style={{ marginLeft: '12px', color: '#94a3b8' }}>Loading Student Roster...</span>
      </div>
    );
  }

  if (error) return <div className="alert alert-error">⚠️ {error}</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Controls */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ flex: 1, minWidth: '250px', position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            type="text"
            className="form-control"
            placeholder="Search by name, email, or reg number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '40px' }}
          />
        </div>
        <select
          className="form-control"
          style={{ width: '160px' }}
          value={riskFilter}
          onChange={(e) => setRiskFilter(e.target.value)}
        >
          <option value="All">All Risk Levels</option>
          <option value="Stable">Stable</option>
          <option value="Warning">Warning</option>
          <option value="Critical">High Risk</option>
        </select>
        <button onClick={handleExportCSV} className="btn" style={{ width: 'auto', padding: '12px 20px', fontSize: '0.85rem' }}>
          <Download size={16} /> CSV Export
        </button>
        {selectedIds.length > 0 && (
          <button
            onClick={() => setShowBulkDelete(true)}
            style={{
              padding: '12px 20px', borderRadius: '12px', border: '1px solid rgba(239,68,68,0.4)',
              background: 'rgba(239,68,68,0.08)', color: '#ef4444', cursor: 'pointer', fontFamily: 'inherit',
              fontWeight: '600', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px'
            }}
          >
            <Trash2 size={16} /> Delete ({selectedIds.length})
          </button>
        )}
      </div>

      {/* Table */}
      <div className="info-card" style={{ maxWidth: 'none', padding: '0', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                <th style={{ padding: '14px 16px', textAlign: 'left', color: '#94a3b8', fontWeight: '600', width: '40px' }}>
                  <input type="checkbox" onChange={(e) => {
                    if (e.target.checked) setSelectedIds(filteredStudents.map(s => s.id));
                    else setSelectedIds([]);
                  }} checked={selectedIds.length === filteredStudents.length && filteredStudents.length > 0} />
                </th>
                <th style={{ padding: '14px 16px', textAlign: 'left', color: '#94a3b8', fontWeight: '600' }}>Name</th>
                <th style={{ padding: '14px 16px', textAlign: 'left', color: '#94a3b8', fontWeight: '600' }}>Reg Number</th>
                <th style={{ padding: '14px 16px', textAlign: 'left', color: '#94a3b8', fontWeight: '600' }}>Email</th>
                <th style={{ padding: '14px 16px', textAlign: 'center', color: '#94a3b8', fontWeight: '600' }}>CGPA</th>
                <th style={{ padding: '14px 16px', textAlign: 'center', color: '#94a3b8', fontWeight: '600' }}>Attendance</th>
                <th style={{ padding: '14px 16px', textAlign: 'center', color: '#94a3b8', fontWeight: '600' }}>Risk</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map(student => {
                const riskStyle = getRiskBadgeStyle(student.risk_status);
                return (
                  <tr
                    key={student.id}
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', cursor: 'pointer', transition: 'background 0.2s' }}
                    onClick={() => setSelectedStudent(student)}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.02)'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <td style={{ padding: '12px 16px' }} onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={selectedIds.includes(student.id)} onChange={() => toggleSelect(student.id)} />
                    </td>
                    <td style={{ padding: '12px 16px', color: '#ffffff', fontWeight: '500' }}>{student.full_name}</td>
                    <td style={{ padding: '12px 16px', color: '#a78bfa', fontWeight: '600', fontSize: '0.85rem' }}>{student.reg_number || '—'}</td>
                    <td style={{ padding: '12px 16px', color: '#94a3b8' }}>{student.email}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', color: '#ffffff', fontWeight: '600' }}>{student.cgpa || '—'}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', color: '#ffffff' }}>{student.attendance_percentage || '—'}%</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <span style={{
                        fontSize: '0.75rem', fontWeight: '700', padding: '3px 10px', borderRadius: '12px',
                        backgroundColor: riskStyle.bg, color: riskStyle.color, border: `1px solid ${riskStyle.border}`
                      }}>
                        {student.risk_status || 'N/A'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filteredStudents.length === 0 && (
          <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>No students found matching your filters.</div>
        )}
      </div>

      {/* Student Detail Drawer */}
      {selectedStudent && (
        <div style={{
          position: 'fixed', top: 0, right: 0, width: '400px', height: '100vh',
          background: 'rgba(13, 17, 30, 0.98)', borderLeft: '1px solid rgba(255,255,255,0.08)',
          zIndex: 200, padding: '30px', overflowY: 'auto', backdropFilter: 'blur(20px)',
          boxShadow: '-10px 0 40px rgba(0,0,0,0.5)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
            <h3 style={{ fontSize: '1.3rem', color: '#ffffff' }}>Student Details</h3>
            <button onClick={() => setSelectedStudent(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
              <X size={22} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {[
              { label: 'Name', value: selectedStudent.full_name },
              { label: 'Email', value: selectedStudent.email },
              { label: 'Reg Number', value: selectedStudent.reg_number || '—' },
              { label: 'CGPA', value: selectedStudent.cgpa || '—' },
              { label: 'Attendance', value: (selectedStudent.attendance_percentage || '—') + '%' },
              { label: 'Risk Status', value: selectedStudent.risk_status || 'N/A' },
              { label: 'Joined', value: selectedStudent.created_at ? new Date(selectedStudent.created_at).toLocaleDateString() : '—' },
            ].map((item, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', padding: '12px 16px',
                borderRadius: '10px', backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)'
              }}>
                <span style={{ color: '#94a3b8', fontSize: '0.85rem', fontWeight: '600' }}>{item.label}</span>
                <span style={{ color: '#ffffff', fontWeight: '500' }}>{item.value}</span>
              </div>
            ))}
          </div>

          <button
            onClick={() => handleDeleteStudent(selectedStudent.id)}
            style={{
              marginTop: '25px', width: '100%', padding: '12px', borderRadius: '12px',
              border: '1px solid rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.08)',
              color: '#ef4444', cursor: 'pointer', fontFamily: 'inherit', fontWeight: '700',
              fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
            }}
          >
            <Trash2 size={16} /> Delete This Student
          </button>
        </div>
      )}

      {/* Bulk Delete Modal */}
      {showBulkDelete && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(0,0,0,0.7)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div className="auth-card" style={{ maxWidth: '440px' }}>
            <h2 style={{ color: '#ef4444', fontSize: '1.3rem', marginBottom: '15px' }}>
              <AlertTriangle size={20} style={{ marginRight: '8px' }} />
              Confirm Bulk Deletion
            </h2>
            <p style={{ color: '#94a3b8', marginBottom: '20px', lineHeight: '1.6' }}>
              You are about to delete <strong style={{ color: '#ffffff' }}>{selectedIds.length}</strong> student account(s). This action is permanent and cannot be undone.
            </p>
            <div className="form-group">
              <label className="form-label" style={{ fontSize: '0.8rem' }}>
                Type "I understand this is irreversible" to confirm
              </label>
              <input
                type="text"
                className="form-control"
                value={bulkDeleteConfirm}
                onChange={(e) => setBulkDeleteConfirm(e.target.value)}
                placeholder="I understand this is irreversible"
              />
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '15px' }}>
              <button
                onClick={() => { setShowBulkDelete(false); setBulkDeleteConfirm(''); }}
                style={{
                  flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(255,255,255,0.03)', color: '#94a3b8', cursor: 'pointer', fontFamily: 'inherit', fontWeight: '600'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={bulkDeleteConfirm !== 'I understand this is irreversible'}
                style={{
                  flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid rgba(239,68,68,0.4)',
                  background: bulkDeleteConfirm === 'I understand this is irreversible' ? 'rgba(239,68,68,0.2)' : 'rgba(239,68,68,0.05)',
                  color: '#ef4444', cursor: bulkDeleteConfirm === 'I understand this is irreversible' ? 'pointer' : 'not-allowed',
                  fontFamily: 'inherit', fontWeight: '700'
                }}
              >
                Delete All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default StudentRoster;
