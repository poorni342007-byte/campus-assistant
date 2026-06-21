import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { api } from '../../api';

function CgpaCalculator({ user }) {
  const [courses, setCourses] = useState([]);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [coursesError, setCoursesError] = useState('');

  // For adding a course
  const [newCourseSem, setNewCourseSem] = useState(1);
  const [newCourseName, setNewCourseName] = useState('');
  const [newCourseCredits, setNewCourseCredits] = useState(3);
  const [newCourseGradePoint, setNewCourseGradePoint] = useState(10.0);
  const [addingCourse, setAddingCourse] = useState(false);
  const [addCourseError, setAddCourseError] = useState('');

  // For editing a course
  const [editingCourseId, setEditingCourseId] = useState(null);
  const [editCourseSem, setEditCourseSem] = useState(1);
  const [editCourseName, setEditCourseName] = useState('');
  const [editCourseCredits, setEditCourseCredits] = useState(3);
  const [editCourseGradePoint, setEditCourseGradePoint] = useState(10.0);

  // Target CGPA simulator state
  const [targetCgpa, setTargetCgpa] = useState('8.5');
  const [remainingCredits, setRemainingCredits] = useState('30');

  // Semester panels expanded state
  const [expandedSems, setExpandedSems] = useState({ 1: true });

  const fetchCourses = async () => {
    if (!user?.id) return;
    setCoursesLoading(true);
    setCoursesError('');
    try {
      const data = await api.get(`/api/cgpa?student_id=${user.id}`);
      setCourses(data);
    } catch (err) {
      setCoursesError(err.message || 'Error loading courses.');
    } finally {
      setCoursesLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, [user?.id]);

  const toggleSemExpanded = (semNum) => {
    setExpandedSems(prev => ({
      ...prev,
      [semNum]: !prev[semNum]
    }));
  };

  const handleAddCourse = async (e) => {
    e.preventDefault();
    if (!newCourseName.trim()) {
      setAddCourseError('Course name cannot be empty');
      return;
    }
    if (newCourseCredits <= 0) {
      setAddCourseError('Credits must be positive');
      return;
    }

    setAddingCourse(true);
    setAddCourseError('');
    try {
      await api.post('/api/cgpa', {
        student_id: user.id,
        semester: newCourseSem,
        course_name: newCourseName.trim(),
        credits: parseInt(newCourseCredits),
        grade_point: parseFloat(newCourseGradePoint)
      });

      setNewCourseName('');
      setNewCourseCredits(3);
      setNewCourseGradePoint(10.0);
      await fetchCourses();
    } catch (err) {
      setAddCourseError(err.message || 'Error adding course.');
    } finally {
      setAddingCourse(false);
    }
  };

  const handleUpdateCourse = async (id) => {
    if (!editCourseName.trim()) {
      alert('Course name cannot be empty');
      return;
    }
    if (editCourseCredits <= 0) {
      alert('Credits must be positive');
      return;
    }

    try {
      await api.put(`/api/cgpa/${id}`, {
        semester: editCourseSem,
        course_name: editCourseName.trim(),
        credits: parseInt(editCourseCredits),
        grade_point: parseFloat(editCourseGradePoint)
      });
      setEditingCourseId(null);
      await fetchCourses();
    } catch (err) {
      alert(err.message || 'Error updating course.');
    }
  };

  const handleDeleteCourse = async (id) => {
    if (!window.confirm('Are you sure you want to delete this course record?')) return;
    try {
      await api.delete(`/api/cgpa/${id}`);
      await fetchCourses();
    } catch (err) {
      alert(err.message || 'Error deleting course.');
    }
  };

  if (coursesLoading && courses.length === 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
        <Loader2 className="animate-spin" size={36} style={{ color: '#06b6d4' }} />
        <span style={{ marginLeft: '12px', color: '#94a3b8' }}>Loading Course Grades...</span>
      </div>
    );
  }

  const totalCredits = courses.reduce((sum, c) => sum + c.credits, 0);
  const totalWeightedPoints = courses.reduce((sum, c) => sum + (c.credits * c.grade_point), 0);
  const cgpaVal = totalCredits > 0 ? (totalWeightedPoints / totalCredits).toFixed(2) : '0.00';

  let standing = 'N/A';
  let standingColor = '#94a3b8';
  if (totalCredits > 0) {
    const g = parseFloat(cgpaVal);
    if (g >= 9.0) { standing = 'Outstanding (O)'; standingColor = '#a78bfa'; }
    else if (g >= 7.5) { standing = 'First Class with Distinction'; standingColor = '#34d399'; }
    else if (g >= 6.0) { standing = 'First Class'; standingColor = '#60a5fa'; }
    else if (g >= 5.0) { standing = 'Second Class'; standingColor = '#fbbf24'; }
    else { standing = 'Fail / Re-evaluation Required'; standingColor = '#f87171'; }
  }

  const target = parseFloat(targetCgpa) || 0;
  const remaining = parseInt(remainingCredits) || 0;
  let simulatorOutput = '';
  let simulatorType = 'info';

  if (target < 0 || target > 10) {
    simulatorOutput = 'Target CGPA must be between 0.0 and 10.0';
    simulatorType = 'danger';
  } else if (remaining < 0) {
    simulatorOutput = 'Remaining credits cannot be negative';
    simulatorType = 'danger';
  } else if (remaining === 0) {
    simulatorOutput = 'Enter remaining credits to run the simulator.';
    simulatorType = 'info';
  } else {
    if (totalCredits === 0) {
      simulatorOutput = `No completed credits. You need a GPA of exactly ${target.toFixed(2)} in your remaining ${remaining} credits.`;
      simulatorType = target <= 10.0 ? 'success' : 'danger';
    } else {
      const reqGpa = ((totalCredits + remaining) * target - totalWeightedPoints) / remaining;
      if (reqGpa > 10.0) {
        simulatorOutput = `Impossible Target! You need an average GPA of ${reqGpa.toFixed(2)} in your remaining ${remaining} credits. (Max is 10.0).`;
        simulatorType = 'danger';
      } else if (reqGpa <= 4.0 && reqGpa > 0) {
        simulatorOutput = `Very Easy! You need an average GPA of only ${reqGpa.toFixed(2)} in your remaining ${remaining} credits.`;
        simulatorType = 'success';
      } else if (reqGpa <= 0) {
        simulatorOutput = `Target Secured! Your current CGPA is high enough that even with a 0.0 average in remaining credits, you stay above ${target.toFixed(2)}.`;
        simulatorType = 'success';
      } else {
        simulatorOutput = `To achieve a CGPA of ${target.toFixed(2)}, you need to maintain an average SGPA of ${reqGpa.toFixed(2)} in your remaining ${remaining} credits.`;
        simulatorType = reqGpa >= 8.5 ? 'warning' : 'info';
      }
    }
  }

  const coursesBySem = {};
  for (let s = 1; s <= 8; s++) {
    coursesBySem[s] = [];
  }
  courses.forEach(c => {
    if (coursesBySem[c.semester]) {
      coursesBySem[c.semester].push(c);
    }
  });

  const getSemesterStats = (semNum) => {
    const semCourses = coursesBySem[semNum] || [];
    const creds = semCourses.reduce((sum, c) => sum + c.credits, 0);
    const weighted = semCourses.reduce((sum, c) => sum + (c.credits * c.grade_point), 0);
    const gpa = creds > 0 ? (weighted / creds).toFixed(2) : '0.00';
    return { credits: creds, gpa };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      <div className="info-card" style={{ maxWidth: 'none', background: 'linear-gradient(135deg, rgba(30, 27, 75, 0.4) 0%, rgba(13, 17, 30, 0.6) 100%)', border: '1px solid var(--card-border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '30px' }}>
          <div>
            <h2 style={{ fontSize: '1.8rem', color: '#ffffff' }}>CGPA Workspace Dashboard</h2>
            <p style={{ color: '#94a3b8', marginTop: '5px' }}>
              Your unified CGPA tracker. Add your courses semester-wise and simulate future targets below.
            </p>
          </div>
          
          <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap' }}>
            <div style={{ textAlign: 'center', minWidth: '120px' }}>
              <div style={{ fontSize: '2.5rem', fontWeight: '800', color: '#a78bfa', textShadow: '0 0 10px rgba(167,139,250,0.2)' }}>
                {cgpaVal}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Current CGPA
              </div>
            </div>
            <div style={{ textAlign: 'center', minWidth: '120px' }}>
              <div style={{ fontSize: '2.5rem', fontWeight: '800', color: '#06b6d4', textShadow: '0 0 10px rgba(6,182,212,0.2)' }}>
                {totalCredits}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Total Credits
              </div>
            </div>
            <div style={{ textAlign: 'center', minWidth: '150px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ 
                color: standingColor, 
                fontWeight: '700', 
                fontSize: '1rem',
                padding: '6px 12px',
                borderRadius: '8px',
                backgroundColor: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.05)'
              }}>
                {standing}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '4px' }}>
                Academic Class
              </div>
            </div>
          </div>
        </div>
      </div>

      {coursesError && <div className="alert alert-error">⚠️ {coursesError}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '30px', alignItems: 'flex-start' }}>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: '700', color: '#ffffff' }}>Semester-wise Records</h3>
          
          {Array.from({ length: 8 }).map((_, idx) => {
            const semNum = idx + 1;
            const isExpanded = !!expandedSems[semNum];
            const semStats = getSemesterStats(semNum);
            const semCoursesList = coursesBySem[semNum] || [];

            return (
              <div 
                key={semNum} 
                className="info-card" 
                style={{ 
                  padding: '20px', 
                  maxWidth: 'none', 
                  backgroundColor: isExpanded ? 'rgba(22, 28, 45, 0.45)' : 'rgba(22, 28, 45, 0.2)',
                  border: isExpanded ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,255,255,0.05)'
                }}
              >
                <div 
                  onClick={() => toggleSemExpanded(semNum)}
                  style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '1.15rem', fontWeight: '700', color: isExpanded ? '#c084fc' : '#ffffff' }}>
                      Semester {semNum}
                    </span>
                    {semCoursesList.length > 0 && (
                      <span style={{ fontSize: '0.75rem', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(255,255,255,0.05)', color: '#94a3b8' }}>
                        {semCoursesList.length} Course(s)
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{ display: 'flex', gap: '15px', fontSize: '0.9rem' }}>
                      <span>Credits: <strong style={{ color: '#cbd5e1' }}>{semStats.credits}</strong></span>
                      {semStats.credits > 0 && (
                        <span>SGPA: <strong style={{ color: '#a78bfa' }}>{semStats.gpa}</strong></span>
                      )}
                    </div>
                    <span style={{ fontSize: '1.2rem', transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease', color: '#94a3b8' }}>
                      ▶
                    </span>
                  </div>
                </div>

                {isExpanded && (
                  <div style={{ marginTop: '20px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '15px' }}>
                    {semCoursesList.length === 0 ? (
                      <p style={{ fontSize: '0.9rem', color: '#94a3b8', fontStyle: 'italic', padding: '10px 0' }}>
                        No courses logged for this semester. Use the quick form on the right or line below to add.
                      </p>
                    ) : (
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                              <th style={{ padding: '8px 4px', color: '#94a3b8', fontWeight: '600' }}>Course Name / Code</th>
                              <th style={{ padding: '8px 4px', color: '#94a3b8', fontWeight: '600', width: '80px', textAlign: 'center' }}>Credits</th>
                              <th style={{ padding: '8px 4px', color: '#94a3b8', fontWeight: '600', width: '100px', textAlign: 'center' }}>Grade Point</th>
                              <th style={{ padding: '8px 4px', color: '#94a3b8', fontWeight: '600', width: '120px', textAlign: 'center' }}>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {semCoursesList.map((c) => {
                              const isEditingCourse = editingCourseId === c.id;
                              return (
                                <tr key={c.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                  {isEditingCourse ? (
                                    <>
                                      <td style={{ padding: '8px 4px' }}>
                                        <input 
                                          className="form-control"
                                          style={{ padding: '6px 10px', fontSize: '0.85rem' }}
                                          type="text"
                                          value={editCourseName}
                                          onChange={(e) => setEditCourseName(e.target.value)}
                                        />
                                      </td>
                                      <td style={{ padding: '8px 4px', textAlign: 'center' }}>
                                        <input 
                                          className="form-control"
                                          style={{ padding: '6px 10px', fontSize: '0.85rem', textAlign: 'center' }}
                                          type="number"
                                          min="1"
                                          value={editCourseCredits}
                                          onChange={(e) => setEditCourseCredits(Math.max(1, parseInt(e.target.value) || 1))}
                                        />
                                      </td>
                                      <td style={{ padding: '8px 4px', textAlign: 'center' }}>
                                        <input 
                                          className="form-control"
                                          style={{ padding: '6px 10px', fontSize: '0.85rem', textAlign: 'center' }}
                                          type="number"
                                          step="0.1"
                                          min="0"
                                          max="10"
                                          value={editCourseGradePoint}
                                          onChange={(e) => setEditCourseGradePoint(Math.max(0, Math.min(10, parseFloat(e.target.value) || 0)))}
                                        />
                                      </td>
                                      <td style={{ padding: '8px 4px', textAlign: 'center' }}>
                                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                          <button 
                                            onClick={() => handleUpdateCourse(c.id)}
                                            style={{ padding: '4px 8px', fontSize: '0.75rem', background: '#34d399', border: 'none', color: '#000', borderRadius: '4px', cursor: 'pointer', fontWeight: '700' }}
                                          >
                                            Save
                                          </button>
                                          <button 
                                            onClick={() => setEditingCourseId(null)}
                                            style={{ padding: '4px 8px', fontSize: '0.75rem', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', borderRadius: '4px', cursor: 'pointer' }}
                                          >
                                            Cancel
                                          </button>
                                        </div>
                                      </td>
                                    </>
                                  ) : (
                                    <>
                                      <td style={{ padding: '10px 4px', color: '#ffffff', fontWeight: '500' }}>{c.course_name}</td>
                                      <td style={{ padding: '10px 4px', textAlign: 'center', color: '#cbd5e1' }}>{c.credits}</td>
                                      <td style={{ padding: '10px 4px', textAlign: 'center', fontWeight: '700', color: c.grade_point >= 9.0 ? '#c084fc' : (c.grade_point >= 7.5 ? '#34d399' : '#cbd5e1') }}>
                                        {c.grade_point.toFixed(1)}
                                      </td>
                                      <td style={{ padding: '10px 4px', textAlign: 'center' }}>
                                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                                          <button 
                                            style={{ background: 'none', border: 'none', color: '#06b6d4', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600' }}
                                            onClick={() => {
                                              setEditingCourseId(c.id);
                                              setEditCourseSem(c.semester);
                                              setEditCourseName(c.course_name);
                                              setEditCourseCredits(c.credits);
                                              setEditCourseGradePoint(c.grade_point);
                                            }}
                                          >
                                            Edit
                                          </button>
                                          <button 
                                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600' }}
                                            onClick={() => handleDeleteCourse(c.id)}
                                          >
                                            Delete
                                          </button>
                                        </div>
                                      </td>
                                    </>
                                  )}
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
          })}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          
          <div className="info-card" style={{ maxWidth: 'none' }}>
            <h3 style={{ fontSize: '1.2rem', color: '#06b6d4', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              🔮 Target CGPA Simulator
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '20px', lineHeight: '1.5' }}>
              Simulate how much GPA you need to average in your upcoming semesters to hit your targets.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Desired Target CGPA</label>
                <input 
                  className="form-control" 
                  type="number" 
                  step="0.05"
                  min="0"
                  max="10"
                  value={targetCgpa} 
                  onChange={(e) => setTargetCgpa(e.target.value)} 
                  placeholder="e.g. 9.0"
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Remaining Credits to Complete</label>
                <input 
                  className="form-control" 
                  type="number" 
                  min="1"
                  value={remainingCredits} 
                  onChange={(e) => setRemainingCredits(e.target.value)} 
                  placeholder="e.g. 45"
                />
              </div>

              <div style={{ 
                padding: '15px', 
                borderRadius: '12px', 
                fontSize: '0.9rem',
                lineHeight: '1.5',
                backgroundColor: simulatorType === 'success' ? 'rgba(16, 185, 129, 0.08)' : (simulatorType === 'danger' ? 'rgba(239, 68, 68, 0.08)' : (simulatorType === 'warning' ? 'rgba(245, 158, 11, 0.08)' : 'rgba(255,255,255,0.03)')),
                border: simulatorType === 'success' ? '1px solid rgba(16, 185, 129, 0.15)' : (simulatorType === 'danger' ? '1px solid rgba(239, 68, 68, 0.15)' : (simulatorType === 'warning' ? '1px solid rgba(245, 158, 11, 0.15)' : '1px solid rgba(255,255,255,0.05)')),
                color: simulatorType === 'success' ? '#a7f3d0' : (simulatorType === 'danger' ? '#fecaca' : (simulatorType === 'warning' ? '#fed7aa' : '#cbd5e1')),
                marginTop: '10px'
              }}>
                <strong>Simulator Analysis:</strong>
                <p style={{ marginTop: '5px' }}>{simulatorOutput}</p>
              </div>
            </div>
          </div>

          <div className="info-card" style={{ maxWidth: 'none' }}>
            <h3 style={{ fontSize: '1.2rem', color: '#a78bfa', marginBottom: '15px' }}>
              ➕ Add Course Grade
            </h3>

            {addCourseError && <div className="alert alert-error" style={{ padding: '8px 12px', fontSize: '0.85rem', marginBottom: '15px' }}>⚠️ {addCourseError}</div>}

            <form onSubmit={handleAddCourse} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Semester</label>
                  <select 
                    className="form-control" 
                    style={{ padding: '12px 14px' }}
                    value={newCourseSem} 
                    onChange={(e) => setNewCourseSem(parseInt(e.target.value))}
                    disabled={addingCourse}
                  >
                    {Array.from({ length: 8 }).map((_, i) => (
                      <option key={i + 1} value={i + 1}>Semester {i + 1}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Credits</label>
                  <input 
                    className="form-control" 
                    type="number" 
                    min="1"
                    value={newCourseCredits} 
                    onChange={(e) => setNewCourseCredits(Math.max(1, parseInt(e.target.value) || 1))}
                    disabled={addingCourse}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Course Name / Code</label>
                <input 
                  className="form-control" 
                  type="text" 
                  value={newCourseName} 
                  onChange={(e) => setNewCourseName(e.target.value)} 
                  placeholder="e.g. CS201 - Data Structures"
                  disabled={addingCourse}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Grade Points / Letter Grade</label>
                <select 
                  className="form-control" 
                  style={{ padding: '12px 14px' }}
                  value={newCourseGradePoint}
                  onChange={(e) => setNewCourseGradePoint(parseFloat(e.target.value))}
                  disabled={addingCourse}
                >
                  <option value="10.0">O (Outstanding) - 10.0</option>
                  <option value="9.0">A+ (Excellent) - 9.0</option>
                  <option value="8.0">A (Very Good) - 8.0</option>
                  <option value="7.0">B+ (Good) - 7.0</option>
                  <option value="6.0">B (Above Average) - 6.0</option>
                  <option value="5.0">C (Average) - 5.0</option>
                  <option value="0.0">F (Fail) - 0.0</option>
                </select>
              </div>

              <button 
                className="btn" 
                type="submit" 
                style={{ padding: '12px', fontSize: '0.9rem', marginTop: '10px' }}
                disabled={addingCourse}
              >
                {addingCourse ? 'Adding...' : 'Add Course Grade ➕'}
              </button>
            </form>
          </div>
          
        </div>
        
      </div>

    </div>
  );
}

export default CgpaCalculator;
