import React, { useState, useEffect } from 'react';
import { Loader2, Users, Search, AlertTriangle, ChevronUp, ChevronDown } from 'lucide-react';
import { api } from '../../api';

function StudentOverview({ user }) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [showLowAttendanceOnly, setShowLowAttendanceOnly] = useState(false);
  const [sortField, setSortField] = useState('full_name'); // 'full_name' | 'reg_number' | 'subject_name' | 'attendance_pct'
  const [sortDirection, setSortDirection] = useState('asc'); // 'asc' | 'desc'

  const fetchStudents = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.get('/api/teacher/students');
      setStudents(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch students.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Filter and Sort Students
  const processedStudents = students
    .filter(student => {
      // 1. Search Query Filter
      const matchQuery = 
        student.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.reg_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.subject_name.toLowerCase().includes(searchQuery.toLowerCase());
      
      // 2. Attendance Filter
      const pct = student.total_classes > 0 ? (student.attended_classes / student.total_classes) * 100 : 0;
      const matchAttendance = !showLowAttendanceOnly || pct < 75;

      return matchQuery && matchAttendance;
    })
    .sort((a, b) => {
      // 3. Sorting
      let valA, valB;

      if (sortField === 'attendance_pct') {
        valA = a.total_classes > 0 ? a.attended_classes / a.total_classes : 0;
        valB = b.total_classes > 0 ? b.attended_classes / b.total_classes : 0;
      } else {
        valA = a[sortField] || '';
        valB = b[sortField] || '';
      }

      if (typeof valA === 'string') {
        return sortDirection === 'asc' 
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      } else {
        return sortDirection === 'asc'
          ? valA - valB
          : valB - valA;
      }
    });

  const renderSortIcon = (field) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? <ChevronUp size={14} style={{ marginLeft: '4px' }} /> : <ChevronDown size={14} style={{ marginLeft: '4px' }} />;
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
        <Loader2 className="animate-spin" size={36} style={{ color: '#06b6d4' }} />
        <span style={{ marginLeft: '12px', color: '#94a3b8' }}>Loading Student Overview...</span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
      
      {/* Search & Filtering Bar */}
      <div className="info-card" style={{ maxWidth: 'none', padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
          {/* Search Box */}
          <div style={{ position: 'relative', flex: 1, minWidth: '280px' }}>
            <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}>
              <Search size={18} />
            </span>
            <input
              type="text"
              className="form-control"
              placeholder="Search by name, roll number, or subject..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '45px', marginBottom: 0 }}
            />
          </div>

          {/* Toggle filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <label 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                color: '#cbd5e1', 
                fontSize: '0.9rem', 
                cursor: 'pointer',
                userSelect: 'none'
              }}
            >
              <input
                type="checkbox"
                checked={showLowAttendanceOnly}
                onChange={(e) => setShowLowAttendanceOnly(e.target.checked)}
                style={{ 
                  width: '18px', 
                  height: '18px', 
                  accentColor: '#06b6d4', 
                  cursor: 'pointer' 
                }}
              />
              Show Low Attendance Only (&lt; 75%)
            </label>
          </div>
        </div>
      </div>

      {error && <div className="alert alert-error"><AlertTriangle size={16} /> {error}</div>}

      {/* Main Roster Panel */}
      <div className="info-card" style={{ maxWidth: 'none', padding: '25px' }}>
        <h3 style={{ fontSize: '1.25rem', color: '#ffffff', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Users size={18} style={{ color: '#a78bfa' }} /> Combined Student Overview
        </h3>

        {processedStudents.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#94a3b8', padding: '40px 20px' }}>
            No students match your search or filter.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <th 
                    style={{ padding: '12px 16px', color: '#94a3b8', fontWeight: '600', fontSize: '0.85rem', textTransform: 'uppercase', cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => handleSort('full_name')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      Student Name {renderSortIcon('full_name')}
                    </div>
                  </th>
                  <th 
                    style={{ padding: '12px 16px', color: '#94a3b8', fontWeight: '600', fontSize: '0.85rem', textTransform: 'uppercase', cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => handleSort('reg_number')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      Reg Number {renderSortIcon('reg_number')}
                    </div>
                  </th>
                  <th 
                    style={{ padding: '12px 16px', color: '#94a3b8', fontWeight: '600', fontSize: '0.85rem', textTransform: 'uppercase', cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => handleSort('subject_name')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      Subject {renderSortIcon('subject_name')}
                    </div>
                  </th>
                  <th style={{ padding: '12px 16px', color: '#94a3b8', fontWeight: '600', fontSize: '0.85rem', textTransform: 'uppercase' }}>
                    Classes Attended
                  </th>
                  <th 
                    style={{ padding: '12px 16px', color: '#94a3b8', fontWeight: '600', fontSize: '0.85rem', textTransform: 'uppercase', cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => handleSort('attendance_pct')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      Attendance % {renderSortIcon('attendance_pct')}
                    </div>
                  </th>
                  <th style={{ padding: '12px 16px', color: '#94a3b8', fontWeight: '600', fontSize: '0.85rem', textTransform: 'uppercase' }}>
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {processedStudents.map((student, idx) => {
                  const pct = student.total_classes > 0 
                    ? ((student.attended_classes / student.total_classes) * 100).toFixed(1) 
                    : '0.0';
                  const isSafe = parseFloat(pct) >= 75;

                  return (
                    <tr 
                      key={`${student.student_id}-${student.subject_name}`} 
                      style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)', transition: 'background-color 0.2s' }}
                      className="table-row-hover"
                    >
                      <td style={{ padding: '16px', color: '#ffffff', fontWeight: '600' }}>{student.full_name}</td>
                      <td style={{ padding: '16px', color: '#a78bfa', fontWeight: '500' }}>{student.reg_number}</td>
                      <td style={{ padding: '16px', color: '#cbd5e1' }}>
                        <span style={{ 
                          padding: '3px 8px', 
                          borderRadius: '6px', 
                          backgroundColor: 'rgba(6, 182, 212, 0.1)', 
                          color: '#06b6d4',
                          fontSize: '0.85rem',
                          fontWeight: '500'
                        }}>
                          {student.subject_name}
                        </span>
                      </td>
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
    </div>
  );
}

export default StudentOverview;
