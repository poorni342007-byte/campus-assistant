import React, { useState, useEffect } from 'react';
import { Loader2, Check, AlertTriangle, CalendarDays, Users, CheckSquare, Square } from 'lucide-react';
import { api } from '../../api';

function SubjectAttendance({ user }) {
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [students, setStudents] = useState([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Attendance Marking Modal State
  const [markingMode, setMarkingMode] = useState(false);
  const [attendanceStates, setAttendanceStates] = useState({}); // studentId -> boolean (present=true, absent=false)

  const fetchSubjects = async () => {
    setLoadingSubjects(true);
    setError('');
    try {
      const data = await api.get('/api/teacher/subjects');
      setSubjects(data);
      if (data.length > 0) {
        setSelectedSubject(data[0].subject_name);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch subjects.');
    } finally {
      setLoadingSubjects(false);
    }
  };

  const fetchStudents = async () => {
    if (!selectedSubject) return;
    setLoadingStudents(true);
    setError('');
    try {
      const data = await api.get('/api/teacher/students');
      // Filter students by selected subject
      const filtered = data.filter(s => s.subject_name === selectedSubject);
      setStudents(filtered);
    } catch (err) {
      setError(err.message || 'Failed to fetch students.');
    } finally {
      setLoadingStudents(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [selectedSubject]);

  const handleStartMarking = () => {
    const states = {};
    students.forEach(s => {
      // Default everyone to present (true)
      states[s.student_id] = true;
    });
    setAttendanceStates(states);
    setMarkingMode(true);
    setSuccess('');
    setError('');
  };

  const toggleAttendance = (studentId) => {
    setAttendanceStates(prev => ({
      ...prev,
      [studentId]: !prev[studentId]
    }));
  };

  const selectAll = (status) => {
    const states = {};
    students.forEach(s => {
      states[s.student_id] = status;
    });
    setAttendanceStates(states);
  };

  const handleSubmitAttendance = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');

    const present_student_ids = [];
    const absent_student_ids = [];

    students.forEach(s => {
      if (attendanceStates[s.student_id]) {
        present_student_ids.push(s.student_id);
      } else {
        absent_student_ids.push(s.student_id);
      }
    });

    try {
      await api.post('/api/teacher/attendance/mark', {
        subject_name: selectedSubject,
        present_student_ids,
        absent_student_ids
      });

      setSuccess('Attendance marked successfully!');
      setMarkingMode(false);
      await fetchStudents();
    } catch (err) {
      setError(err.message || 'Failed to mark attendance.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingSubjects) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
        <Loader2 className="animate-spin" size={36} style={{ color: '#06b6d4' }} />
        <span style={{ marginLeft: '12px', color: '#94a3b8' }}>Loading Subjects...</span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      
      {/* Top Controller */}
      <div className="info-card" style={{ maxWidth: 'none', padding: '25px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
          <div className="form-group" style={{ marginBottom: 0, minWidth: '280px' }}>
            <label className="form-label" style={{ fontSize: '0.85rem' }}>Select Subject</label>
            {subjects.length === 0 ? (
              <div style={{ color: '#94a3b8', fontSize: '0.95rem', marginTop: '8px' }}>No subjects assigned.</div>
            ) : (
              <select
                className="form-control"
                value={selectedSubject}
                onChange={(e) => { setSelectedSubject(e.target.value); setSuccess(''); setError(''); }}
                style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)', cursor: 'pointer' }}
              >
                {subjects.map((sub) => (
                  <option key={sub.id} value={sub.subject_name} style={{ backgroundColor: '#0f172a' }}>
                    {sub.subject_name} ({sub.department || 'All'})
                  </option>
                ))}
              </select>
            )}
          </div>

          {selectedSubject && students.length > 0 && !markingMode && (
            <button 
              className="btn" 
              onClick={handleStartMarking}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 24px' }}
            >
              <CalendarDays size={18} /> Mark Today's Attendance
            </button>
          )}
        </div>
      </div>

      {success && <div className="alert alert-success"><Check size={16} /> {success}</div>}
      {error && <div className="alert alert-error"><AlertTriangle size={16} /> {error}</div>}

      {/* Main Mode View */}
      {markingMode ? (
        <div className="info-card" style={{ maxWidth: 'none', padding: '25px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', flexWrap: 'wrap', gap: '15px' }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', color: '#ffffff' }}>Marking Attendance for {selectedSubject}</h3>
              <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '4px' }}>Toggle the status for each student below.</p>
            </div>
            
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                type="button" 
                className="btn" 
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '6px 12px', fontSize: '0.8rem', boxShadow: 'none' }}
                onClick={() => selectAll(true)}
              >
                Select All Present
              </button>
              <button 
                type="button" 
                className="btn" 
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '6px 12px', fontSize: '0.8rem', boxShadow: 'none' }}
                onClick={() => selectAll(false)}
              >
                Select All Absent
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmitAttendance}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '25px' }}>
              {students.map((student) => {
                const isPresent = attendanceStates[student.student_id];
                return (
                  <div 
                    key={student.student_id} 
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '14px 20px',
                      borderRadius: '12px',
                      backgroundColor: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid rgba(255, 255, 255, 0.05)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onClick={() => toggleAttendance(student.student_id)}
                  >
                    <div>
                      <div style={{ color: '#ffffff', fontWeight: '600' }}>{student.full_name}</div>
                      <div style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '2px' }}>
                        Reg No: <span style={{ color: '#a78bfa', fontWeight: '500' }}>{student.reg_number}</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                      <span style={{ 
                        fontSize: '0.8rem', 
                        fontWeight: '700', 
                        padding: '4px 10px', 
                        borderRadius: '8px',
                        backgroundColor: isPresent ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        color: isPresent ? '#34d399' : '#fca5a5'
                      }}>
                        {isPresent ? 'PRESENT' : 'ABSENT'}
                      </span>
                      {isPresent ? (
                        <CheckSquare size={22} style={{ color: '#10b981' }} />
                      ) : (
                        <Square size={22} style={{ color: '#ef4444' }} />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                type="submit" 
                className="btn" 
                disabled={submitting}
                style={{ flex: 1, padding: '12px' }}
              >
                {submitting ? (
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <Loader2 className="animate-spin" size={18} /> Submitting...
                  </span>
                ) : 'Submit Attendance'}
              </button>
              <button 
                type="button" 
                className="logout-btn" 
                style={{ flex: 1, padding: '12px', marginTop: 0 }}
                onClick={() => setMarkingMode(false)}
                disabled={submitting}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* Student List Table View */
        <div className="info-card" style={{ maxWidth: 'none', padding: '25px' }}>
          <h3 style={{ fontSize: '1.25rem', color: '#ffffff', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={18} style={{ color: '#06b6d4' }} /> Student Roster
          </h3>

          {loadingStudents ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '150px' }}>
              <Loader2 className="animate-spin" size={28} style={{ color: '#06b6d4' }} />
              <span style={{ marginLeft: '12px', color: '#94a3b8' }}>Loading Students...</span>
            </div>
          ) : students.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#94a3b8', padding: '40px 20px' }}>
              No students found for this subject.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    <th style={{ padding: '12px 16px', color: '#94a3b8', fontWeight: '600', fontSize: '0.85rem', textTransform: 'uppercase' }}>Student Name</th>
                    <th style={{ padding: '12px 16px', color: '#94a3b8', fontWeight: '600', fontSize: '0.85rem', textTransform: 'uppercase' }}>Reg Number</th>
                    <th style={{ padding: '12px 16px', color: '#94a3b8', fontWeight: '600', fontSize: '0.85rem', textTransform: 'uppercase' }}>Classes (Attended/Total)</th>
                    <th style={{ padding: '12px 16px', color: '#94a3b8', fontWeight: '600', fontSize: '0.85rem', textTransform: 'uppercase' }}>Attendance %</th>
                    <th style={{ padding: '12px 16px', color: '#94a3b8', fontWeight: '600', fontSize: '0.85rem', textTransform: 'uppercase' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => {
                    const pct = student.total_classes > 0 
                      ? ((student.attended_classes / student.total_classes) * 100).toFixed(1) 
                      : '0.0';
                    const isSafe = parseFloat(pct) >= 75;

                    return (
                      <tr 
                        key={student.student_id} 
                        style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)', transition: 'background-color 0.2s' }}
                        className="table-row-hover"
                      >
                        <td style={{ padding: '16px', color: '#ffffff', fontWeight: '600' }}>{student.full_name}</td>
                        <td style={{ padding: '16px', color: '#a78bfa', fontWeight: '500' }}>{student.reg_number}</td>
                        <td style={{ padding: '16px', color: '#e2e8f0' }}>{student.attended_classes} / {student.total_classes}</td>
                        <td style={{ padding: '16px', color: isSafe ? '#34d399' : '#ef4444', fontWeight: '700' }}>{pct}%</td>
                        <td style={{ padding: '16px' }}>
                          <span style={{ 
                            fontSize: '0.75rem', 
                            fontWeight: '700', 
                            padding: '4px 10px', 
                            borderRadius: '12px',
                            backgroundColor: isSafe ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                            color: isSafe ? '#34d399' : '#fca5a5',
                            border: isSafe ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(239, 68, 68, 0.2)'
                          }}>
                            {isSafe ? 'Good' : 'Low'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default SubjectAttendance;
