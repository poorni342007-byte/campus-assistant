import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { api } from '../../api';

function AttendanceTracker({ user }) {
  const [attendance, setAttendance] = useState([]);
  const [attendanceLoading, setAttendanceLoading] = useState(true);
  const [attendanceError, setAttendanceError] = useState('');
  
  // For adding a new subject
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newAttended, setNewAttended] = useState(0);
  const [newTotal, setNewTotal] = useState(0);
  const [addingSubject, setAddingSubject] = useState(false);
  const [addSubjectError, setAddSubjectError] = useState('');

  // For editing a subject
  const [editingId, setEditingId] = useState(null);
  const [editSubjectName, setEditSubjectName] = useState('');
  const [editAttended, setEditAttended] = useState(0);
  const [editTotal, setEditTotal] = useState(0);

  const fetchAttendance = async () => {
    if (!user?.id) return;
    setAttendanceLoading(true);
    setAttendanceError('');
    try {
      const data = await api.get(`/api/attendance?student_id=${user.id}`);
      setAttendance(data);
    } catch (err) {
      setAttendanceError(err.message || 'Error loading attendance.');
    } finally {
      setAttendanceLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, [user?.id]);

  const handleAddSubject = async (e) => {
    e.preventDefault();
    if (!newSubjectName.trim()) {
      setAddSubjectError('Subject name cannot be empty');
      return;
    }
    if (newAttended < 0 || newTotal < 0) {
      setAddSubjectError('Classes cannot be negative');
      return;
    }
    if (newAttended > newTotal) {
      setAddSubjectError('Attended classes cannot exceed total classes');
      return;
    }

    setAddingSubject(true);
    setAddSubjectError('');
    try {
      await api.post('/api/attendance', {
        student_id: user.id,
        subject_name: newSubjectName.trim(),
        attended_classes: parseInt(newAttended),
        total_classes: parseInt(newTotal)
      });

      setNewSubjectName('');
      setNewAttended(0);
      setNewTotal(0);
      await fetchAttendance();
    } catch (err) {
      setAddSubjectError(err.message || 'Error adding subject.');
    } finally {
      setAddingSubject(false);
    }
  };

  const handleQuickIncrement = async (record, isPresent) => {
    const updatedAttended = isPresent ? record.attended_classes + 1 : record.attended_classes;
    const updatedTotal = record.total_classes + 1;

    try {
      await api.put(`/api/attendance/${record.id}`, {
        subject_name: record.subject_name,
        attended_classes: updatedAttended,
        total_classes: updatedTotal
      });
      await fetchAttendance();
    } catch (err) {
      alert(err.message || 'Error updating attendance.');
    }
  };

  const handleDeleteSubject = async (id) => {
    if (!window.confirm('Are you sure you want to delete this subject?')) return;
    try {
      await api.delete(`/api/attendance/${id}`);
      await fetchAttendance();
    } catch (err) {
      alert(err.message || 'Error deleting subject.');
    }
  };

  const handleUpdateSubject = async (id) => {
    if (!editSubjectName.trim()) {
      alert('Subject name cannot be empty');
      return;
    }
    if (editAttended < 0 || editTotal < 0) {
      alert('Classes cannot be negative');
      return;
    }
    if (editAttended > editTotal) {
      alert('Attended classes cannot exceed total classes');
      return;
    }

    try {
      await api.put(`/api/attendance/${id}`, {
        subject_name: editSubjectName.trim(),
        attended_classes: parseInt(editAttended),
        total_classes: parseInt(editTotal)
      });
      setEditingId(null);
      await fetchAttendance();
    } catch (err) {
      alert(err.message || 'Error updating subject.');
    }
  };

  const getAttendanceInsight = (attended, total) => {
    if (total === 0) return { text: 'No classes logged yet.', type: 'info' };
    const pct = (attended / total) * 100;
    
    if (pct >= 75) {
      const maxBunk = Math.floor((4 * attended - 3 * total) / 3);
      if (maxBunk > 0) {
        return {
          text: `Safe! You can bunk the next ${maxBunk} class${maxBunk > 1 ? 'es' : ''}.`,
          type: 'success'
        };
      } else {
        return {
          text: 'On the line! Do not bunk any classes.',
          type: 'warning'
        };
      }
    } else {
      const reqClasses = 3 * total - 4 * attended;
      return {
        text: `Critical! You must attend the next ${reqClasses} class${reqClasses > 1 ? 'es' : ''} consecutively.`,
        type: 'danger'
      };
    }
  };

  if (attendanceLoading && attendance.length === 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
        <Loader2 className="animate-spin" size={36} style={{ color: '#06b6d4' }} />
        <span style={{ marginLeft: '12px', color: '#94a3b8' }}>Loading Attendance Records...</span>
      </div>
    );
  }

  const totalAttendedSum = attendance.reduce((sum, item) => sum + item.attended_classes, 0);
  const totalClassesSum = attendance.reduce((sum, item) => sum + item.total_classes, 0);
  const overallPercentage = totalClassesSum > 0 ? ((totalAttendedSum / totalClassesSum) * 100).toFixed(1) : 0;
  const isSafe = overallPercentage >= 75;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      <div className="info-card" style={{ maxWidth: 'none', background: 'linear-gradient(135deg, rgba(30, 27, 75, 0.4) 0%, rgba(13, 17, 30, 0.6) 100%)', border: '1px solid var(--card-border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
          <div>
            <h2 style={{ fontSize: '1.8rem', color: '#ffffff' }}>Overall Attendance Summary</h2>
            <p style={{ color: '#94a3b8', marginTop: '5px' }}>
              Your average attendance across all registered courses. Keep it above 75% to stay safe.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '2.5rem', fontWeight: '800', color: isSafe ? '#34d399' : '#fca5a5' }}>
                {totalClassesSum > 0 ? `${overallPercentage}%` : 'N/A'}
              </span>
              <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                {totalAttendedSum} / {totalClassesSum} Total Classes
              </div>
            </div>
            <div style={{
              padding: '8px 16px',
              borderRadius: '12px',
              fontWeight: '700',
              textTransform: 'uppercase',
              fontSize: '0.8rem',
              backgroundColor: totalClassesSum === 0 ? 'rgba(255,255,255,0.05)' : (isSafe ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)'),
              color: totalClassesSum === 0 ? '#94a3b8' : (isSafe ? '#34d399' : '#fca5a5'),
              border: totalClassesSum === 0 ? '1px solid rgba(255,255,255,0.1)' : (isSafe ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(239, 68, 68, 0.2)')
            }}>
              {totalClassesSum === 0 ? 'No Data' : (isSafe ? 'Good Standing' : 'Critical Warning')}
            </div>
          </div>
        </div>
      </div>

      {attendanceError && <div className="alert alert-error">⚠️ {attendanceError}</div>}

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '20px'
      }}>
        {attendance.map((rec) => {
          const isEditing = editingId === rec.id;
          const pct = rec.total_classes > 0 ? ((rec.attended_classes / rec.total_classes) * 100).toFixed(1) : 0;
          const insight = getAttendanceInsight(rec.attended_classes, rec.total_classes);

          return (
            <div 
              key={rec.id} 
              className="info-card" 
              style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                justifyContent: 'space-between',
                border: isEditing ? '1px solid var(--accent-color)' : '1px solid var(--card-border)',
                boxShadow: isEditing ? '0 0 15px rgba(6, 182, 212, 0.15)' : 'none'
              }}
            >
              {isEditing ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', width: '100%' }}>
                  <h3 style={{ fontSize: '1.2rem', color: '#c084fc' }}>Edit Subject</h3>
                  
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.75rem' }}>Subject Name</label>
                    <input 
                      className="form-control" 
                      type="text" 
                      value={editSubjectName} 
                      onChange={(e) => setEditSubjectName(e.target.value)} 
                      placeholder="e.g. Mathematics II"
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>Attended</label>
                      <input 
                        className="form-control" 
                        type="number" 
                        min="0"
                        value={editAttended} 
                        onChange={(e) => setEditAttended(Math.max(0, parseInt(e.target.value) || 0))} 
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>Total Classes</label>
                      <input 
                        className="form-control" 
                        type="number" 
                        min="0"
                        value={editTotal} 
                        onChange={(e) => setEditTotal(Math.max(0, parseInt(e.target.value) || 0))} 
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                    <button 
                      className="btn" 
                      style={{ flex: 1, padding: '10px', fontSize: '0.9rem' }}
                      onClick={() => handleUpdateSubject(rec.id)}
                    >
                      Save
                    </button>
                    <button 
                      className="logout-btn" 
                      style={{ flex: 1, padding: '10px', marginTop: 0 }}
                      onClick={() => setEditingId(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between', gap: '15px' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                      <div>
                        <h3 style={{ fontSize: '1.2rem', fontWeight: '700', color: '#ffffff', wordBreak: 'break-word' }}>
                          {rec.subject_name}
                        </h3>
                        <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                          {rec.attended_classes} / {rec.total_classes} classes
                        </span>
                      </div>
                      <span style={{ 
                        fontSize: '1.3rem', 
                        fontWeight: '800', 
                        color: pct >= 75 ? '#34d399' : '#fca5a5' 
                      }}>
                        {rec.total_classes > 0 ? `${pct}%` : '0%'}
                      </span>
                    </div>

                    <div style={{ 
                      width: '100%', 
                      height: '6px', 
                      backgroundColor: 'rgba(255,255,255,0.05)', 
                      borderRadius: '3px', 
                      overflow: 'hidden', 
                      margin: '15px 0' 
                    }}>
                      <div style={{ 
                        width: `${Math.min(100, pct)}%`, 
                        height: '100%', 
                        background: pct >= 75 ? 'linear-gradient(90deg, #06b6d4, #34d399)' : 'linear-gradient(90deg, #f87171, #f97316)', 
                        borderRadius: '3px' 
                      }}></div>
                    </div>

                    <div style={{ 
                      padding: '10px 12px', 
                      borderRadius: '8px', 
                      fontSize: '0.85rem',
                      backgroundColor: insight.type === 'success' ? 'rgba(16, 185, 129, 0.08)' : (insight.type === 'danger' ? 'rgba(239, 68, 68, 0.08)' : 'rgba(245, 158, 11, 0.08)'),
                      border: insight.type === 'success' ? '1px solid rgba(16, 185, 129, 0.15)' : (insight.type === 'danger' ? '1px solid rgba(239, 68, 68, 0.15)' : '1px solid rgba(245, 158, 11, 0.15)'),
                      color: insight.type === 'success' ? '#a7f3d0' : (insight.type === 'danger' ? '#fecaca' : '#fed7aa'),
                      marginBottom: '15px'
                    }}>
                      💡 {insight.text}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button 
                        className="btn" 
                        style={{ flex: 1, padding: '10px', fontSize: '0.85rem', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', boxShadow: 'none' }}
                        onClick={() => handleQuickIncrement(rec, true)}
                      >
                        Present ✅
                      </button>
                      <button 
                        className="btn" 
                        style={{ flex: 1, padding: '10px', fontSize: '0.85rem', background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', boxShadow: 'none' }}
                        onClick={() => handleQuickIncrement(rec, false)}
                      >
                        Absent ❌
                      </button>
                    </div>

                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button 
                        className="btn" 
                        style={{ 
                          flex: 1, 
                          padding: '6px 12px', 
                          fontSize: '0.8rem', 
                          background: 'rgba(255,255,255,0.05)', 
                          border: '1px solid rgba(255,255,255,0.1)',
                          color: '#e2e8f0',
                          boxShadow: 'none'
                        }}
                        onClick={() => {
                          setEditingId(rec.id);
                          setEditSubjectName(rec.subject_name);
                          setEditAttended(rec.attended_classes);
                          setEditTotal(rec.total_classes);
                        }}
                      >
                        Edit ⚙️
                      </button>
                      <button 
                        className="logout-btn" 
                        style={{ 
                          flex: 1, 
                          padding: '6px 12px', 
                          fontSize: '0.8rem', 
                          marginTop: 0,
                          border: '1px solid rgba(239, 68, 68, 0.2)',
                          boxShadow: 'none'
                        }}
                        onClick={() => handleDeleteSubject(rec.id)}
                      >
                        Delete 🗑️
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        <div 
          className="info-card" 
          style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'space-between',
            border: '1px dashed rgba(255,255,255,0.2)',
            background: 'rgba(255,255,255,0.01)'
          }}
        >
          <form onSubmit={handleAddSubject} style={{ display: 'flex', flexDirection: 'column', gap: '15px', width: '100%', height: '100%', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', color: '#a78bfa', marginBottom: '15px' }}>+ Add New Subject</h3>
              
              {addSubjectError && <div style={{ color: '#ef4444', fontSize: '0.85rem', marginBottom: '10px' }}>⚠️ {addSubjectError}</div>}

              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Subject Name</label>
                <input 
                  className="form-control" 
                  type="text" 
                  value={newSubjectName} 
                  onChange={(e) => setNewSubjectName(e.target.value)} 
                  placeholder="e.g. Physics I"
                  disabled={addingSubject}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '15px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Attended</label>
                  <input 
                    className="form-control" 
                    type="number" 
                    min="0"
                    value={newAttended} 
                    onChange={(e) => setNewAttended(Math.max(0, parseInt(e.target.value) || 0))}
                    disabled={addingSubject}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Total Classes</label>
                  <input 
                    className="form-control" 
                    type="number" 
                    min="0"
                    value={newTotal} 
                    onChange={(e) => setNewTotal(Math.max(0, parseInt(e.target.value) || 0))}
                    disabled={addingSubject}
                  />
                </div>
              </div>
            </div>

            <button 
              className="btn" 
              type="submit"
              disabled={addingSubject}
              style={{ padding: '12px', fontSize: '0.95rem' }}
            >
              {addingSubject ? 'Adding...' : 'Add Subject'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default AttendanceTracker;
