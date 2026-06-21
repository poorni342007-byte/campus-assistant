import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { api } from '../../api';

function PerformancePredictor({ user }) {
  const [predictData, setPredictData] = useState(null);
  const [predictLoading, setPredictLoading] = useState(false);
  const [predictError, setPredictError] = useState('');
  const [simulatedGrades, setSimulatedGrades] = useState({});
  const [attendance, setAttendance] = useState([]);
  const [courses, setCourses] = useState([]);

  const fetchPredictData = async () => {
    if (!user?.id) return;
    setPredictLoading(true);
    setPredictError('');
    try {
      const data = await api.get(`/api/performance/predict?student_id=${user.id}`);
      setPredictData(data);
    } catch (err) {
      setPredictError(err.message || 'Error loading predictions.');
    } finally {
      setPredictLoading(false);
    }
  };

  const fetchAttendance = async () => {
    if (!user?.id) return;
    try {
      const data = await api.get(`/api/attendance?student_id=${user.id}`);
      setAttendance(data);
    } catch (err) {
      // silently fail – attendance is supplementary here
    }
  };

  const fetchCourses = async () => {
    if (!user?.id) return;
    try {
      const data = await api.get(`/api/cgpa?student_id=${user.id}`);
      setCourses(data);
    } catch (err) {
      // silently fail
    }
  };

  useEffect(() => {
    fetchPredictData();
    fetchAttendance();
    fetchCourses();
  }, [user?.id]);

  if (predictLoading && !predictData) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
        <Loader2 className="animate-spin" size={36} style={{ color: '#06b6d4' }} />
        <span style={{ marginLeft: '12px', color: '#94a3b8' }}>Analyzing Academics...</span>
      </div>
    );
  }

  if (predictError) {
    return <div className="alert alert-error">⚠️ {predictError}</div>;
  }

  const completedCredits = courses.reduce((sum, c) => sum + c.credits, 0);
  const completedWeightedPoints = courses.reduce((sum, c) => sum + (c.credits * c.grade_point), 0);

  let simSemesterCredits = 0;
  let simSemesterWeightedPoints = 0;

  attendance.forEach(sub => {
    const subCreds = simulatedGrades[sub.id]?.credits ?? 3;
    const subGp = simulatedGrades[sub.id]?.gradePoint ?? 10.0;
    const isIncluded = simulatedGrades[sub.id]?.active ?? true;
    if (isIncluded) {
      simSemesterCredits += subCreds;
      simSemesterWeightedPoints += (subCreds * subGp);
    }
  });

  const simSGPA = simSemesterCredits > 0 ? (simSemesterWeightedPoints / simSemesterCredits).toFixed(2) : '0.00';

  const newTotalCredits = completedCredits + simSemesterCredits;
  const newTotalWeightedPoints = completedWeightedPoints + simSemesterWeightedPoints;
  const simCGPA = newTotalCredits > 0 ? (newTotalWeightedPoints / newTotalCredits).toFixed(2) : '0.00';

  const statusColors = {
    Stable: { text: '#34d399', bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.2)' },
    Warning: { text: '#fbbf24', bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.2)' },
    Critical: { text: '#f87171', bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.2)' }
  };

  const overallStatus = predictData?.overall_status || 'Stable';
  const statusStyle = statusColors[overallStatus] || statusColors.Stable;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>

      {/* Risk Status Indicator */}
      <div className="info-card" style={{
        maxWidth: 'none',
        background: 'linear-gradient(135deg, rgba(30, 27, 75, 0.4) 0%, rgba(13, 17, 30, 0.6) 100%)',
        border: '1px solid var(--card-border)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
          <div>
            <h2 style={{ fontSize: '1.8rem', color: '#ffffff' }}>Performance Analytics & Projections</h2>
            <p style={{ color: '#94a3b8', marginTop: '5px' }}>
              Heuristic modeling based on database standings. Check warnings and simulate grade target adjustments.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '1.3rem', fontWeight: '800', color: statusStyle.text, textTransform: 'uppercase' }}>
                {overallStatus} Risk Standing
              </span>
              <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                Based on overall attendance & CGPA metrics
              </div>
            </div>
            <div style={{
              padding: '12px 24px',
              borderRadius: '12px',
              fontWeight: '800',
              fontSize: '1rem',
              backgroundColor: statusStyle.bg,
              color: statusStyle.text,
              border: `1px solid ${statusStyle.border}`
            }}>
              {overallStatus === 'Stable' ? 'LOW RISK' : (overallStatus === 'Warning' ? 'MEDIUM RISK' : 'HIGH RISK')}
            </div>
          </div>
        </div>
      </div>

      {/* Prediction Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>

        <div className="info-card" style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '20px' }}>
          <div>
            <div style={{ color: '#a78bfa', fontSize: '0.85rem', fontWeight: '600', textTransform: 'uppercase', marginBottom: '10px' }}>CGPA Baseline</div>
            <h3 style={{ fontSize: '2.5rem', fontWeight: '800', color: '#ffffff', textShadow: '0 0 10px rgba(167,139,250,0.1)' }}>{predictData?.current_cgpa || '7.50'}</h3>
            <p style={{ color: '#cbd5e1', fontSize: '0.9rem', lineHeight: '1.5', marginTop: '10px' }}>
              Completed academic courses average. Serves as base projection target.
            </p>
          </div>
        </div>

        <div className="info-card" style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '20px' }}>
          <div>
            <div style={{ color: '#06b6d4', fontSize: '0.85rem', fontWeight: '600', textTransform: 'uppercase', marginBottom: '10px' }}>Projected SGPA (Next Sem)</div>
            <h3 style={{ fontSize: '2.5rem', fontWeight: '800', color: '#06b6d4', textShadow: '0 0 10px rgba(6,182,212,0.1)' }}>{predictData?.projected_sgpa || '7.50'}</h3>
            <p style={{ color: '#cbd5e1', fontSize: '0.9rem', lineHeight: '1.5', marginTop: '10px' }}>
              Projected term average. Reflects attendance warnings and grade standing penalties.
            </p>
          </div>
        </div>

        <div className="info-card" style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '20px' }}>
          <div>
            <div style={{ color: '#34d399', fontSize: '0.85rem', fontWeight: '600', textTransform: 'uppercase', marginBottom: '10px' }}>Overall Attendance</div>
            <h3 style={{ fontSize: '2.5rem', fontWeight: '800', color: '#34d399' }}>{predictData?.overall_attendance || '100.0'}%</h3>
            <p style={{ color: '#cbd5e1', fontSize: '0.9rem', lineHeight: '1.5', marginTop: '10px' }}>
              Combined attendance across all courses. If average falls below 75%, SGPA projection is penalized.
            </p>
          </div>
        </div>

      </div>

      {/* Warnings & Simulator Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: '30px', alignItems: 'flex-start' }}>

        {/* Warning Panels */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h3 style={{ fontSize: '1.25rem', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
            ⚠️ Academic Danger Zones
          </h3>

          {/* Attendance Warnings */}
          <div className="info-card" style={{ maxWidth: 'none', padding: '20px' }}>
            <h4 style={{ fontSize: '1.05rem', color: '#fbbf24', marginBottom: '15px' }}>Attendance Debarment Risks</h4>
            {(!predictData?.attendance_warnings || predictData.attendance_warnings.length === 0) ? (
              <p style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '0.9rem' }}>
                ✓ All registered courses are currently above 75% attendance threshold. Keep it up!
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {predictData.attendance_warnings.map(warn => (
                  <div key={warn.id} style={{
                    padding: '12px 15px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(239, 68, 68, 0.05)',
                    border: '1px solid rgba(239, 68, 68, 0.15)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '10px'
                  }}>
                    <div>
                      <strong style={{ color: '#ffffff', fontSize: '0.95rem' }}>{warn.subject_name}</strong>
                      <div style={{ color: '#94a3b8', fontSize: '0.8rem', marginTop: '3px' }}>
                        Current: {warn.percentage}% ({warn.attended}/{warn.total} classes)
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{
                        fontSize: '0.75rem',
                        fontWeight: '700',
                        padding: '3px 8px',
                        borderRadius: '12px',
                        backgroundColor: warn.risk === 'High' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                        color: warn.risk === 'High' ? '#f87171' : '#fbbf24'
                      }}>
                        {warn.risk} Debarment Risk
                      </span>
                      <div style={{ color: '#ef4444', fontSize: '0.8rem', fontWeight: '600', marginTop: '5px' }}>
                        Attend next {warn.consecutive_needed} classes consecutively
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Grade Warnings */}
          <div className="info-card" style={{ maxWidth: 'none', padding: '20px' }}>
            <h4 style={{ fontSize: '1.05rem', color: '#c084fc', marginBottom: '15px' }}>Academic Improvement Zones</h4>
            {(!predictData?.grade_warnings || predictData.grade_warnings.length === 0) ? (
              <p style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '0.9rem' }}>
                ✓ No core grade records fall below the B/C grade boundary. Great performance!
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {predictData.grade_warnings.map(warn => (
                  <div key={warn.id} style={{
                    padding: '12px 15px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(192, 132, 252, 0.05)',
                    border: '1px solid rgba(192, 132, 252, 0.15)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '10px'
                  }}>
                    <div>
                      <strong style={{ color: '#ffffff', fontSize: '0.95rem' }}>{warn.course_name} (Sem {warn.semester})</strong>
                      <div style={{ color: '#94a3b8', fontSize: '0.8rem', marginTop: '3px' }}>
                        Credits: {warn.credits} | Current Grade Point: {warn.grade_point.toFixed(1)}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{
                        fontSize: '0.75rem',
                        color: '#c084fc',
                        fontWeight: '700',
                        padding: '3px 8px',
                        borderRadius: '12px',
                        backgroundColor: 'rgba(192, 132, 252, 0.12)',
                        border: '1px solid rgba(192, 132, 252, 0.2)'
                      }}>
                        Weak Standing
                      </span>
                      <div style={{ color: '#d8b4fe', fontSize: '0.8rem', fontWeight: '500', marginTop: '5px' }}>
                        {warn.recommendation}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* What-If Simulator */}
        <div className="info-card" style={{ maxWidth: 'none', padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h3 style={{ fontSize: '1.25rem', color: '#06b6d4', display: 'flex', alignItems: 'center', gap: '8px' }}>
            🔮 What-If Semester Simulator
          </h3>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: '1.5' }}>
            Mock hypothetical final course grades for your active Attendance courses to forecast your SGPA and updated cumulative CGPA.
          </p>

          {attendance.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '10px' }}>
              No active courses logged in the Attendance Tracker. Please add subjects to run score simulations.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '8px' }}>
                      <th style={{ padding: '8px 4px', color: '#94a3b8', fontWeight: '600' }}>Active Subject</th>
                      <th style={{ padding: '8px 4px', color: '#94a3b8', fontWeight: '600', width: '70px', textAlign: 'center' }}>Credits</th>
                      <th style={{ padding: '8px 4px', color: '#94a3b8', fontWeight: '600', width: '130px', textAlign: 'center' }}>Mock Grade</th>
                      <th style={{ padding: '8px 4px', color: '#94a3b8', fontWeight: '600', width: '60px', textAlign: 'center' }}>Include</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendance.map(sub => {
                      const creditsVal = simulatedGrades[sub.id]?.credits ?? 3;
                      const gradeVal = simulatedGrades[sub.id]?.gradePoint ?? 10.0;
                      const activeVal = simulatedGrades[sub.id]?.active ?? true;

                      return (
                        <tr key={sub.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                          <td style={{ padding: '10px 4px', color: '#ffffff', fontWeight: '500' }}>{sub.subject_name}</td>
                          <td style={{ padding: '10px 4px', textAlign: 'center' }}>
                            <input
                              className="form-control"
                              style={{ padding: '4px 6px', fontSize: '0.8rem', textAlign: 'center', width: '50px', margin: '0 auto', backgroundColor: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)' }}
                              type="number"
                              min="1"
                              max="10"
                              value={creditsVal}
                              onChange={(e) => {
                                const c = Math.max(1, parseInt(e.target.value) || 1);
                                setSimulatedGrades(prev => ({
                                  ...prev,
                                  [sub.id]: { ...prev[sub.id], credits: c }
                                }));
                              }}
                            />
                          </td>
                          <td style={{ padding: '10px 4px', textAlign: 'center' }}>
                            <select
                              className="form-control"
                              style={{ padding: '4px 8px', fontSize: '0.8rem', backgroundColor: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)' }}
                              value={gradeVal.toFixed(1)}
                              onChange={(e) => {
                                const gp = parseFloat(e.target.value);
                                setSimulatedGrades(prev => ({
                                  ...prev,
                                  [sub.id]: { ...prev[sub.id], gradePoint: gp }
                                }));
                              }}
                            >
                              <option value="10.0">O (Outstanding) - 10.0</option>
                              <option value="9.0">A+ (Excellent) - 9.0</option>
                              <option value="8.0">A (Very Good) - 8.0</option>
                              <option value="7.0">B+ (Good) - 7.0</option>
                              <option value="6.0">B (Above Average) - 6.0</option>
                              <option value="5.0">C (Average) - 5.0</option>
                              <option value="0.0">F (Fail) - 0.0</option>
                            </select>
                          </td>
                          <td style={{ padding: '10px 4px', textAlign: 'center' }}>
                            <input
                              type="checkbox"
                              style={{ transform: 'scale(1.1)', cursor: 'pointer' }}
                              checked={activeVal}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setSimulatedGrades(prev => ({
                                  ...prev,
                                  [sub.id]: { ...prev[sub.id], active: checked }
                                }));
                              }}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Simulation Outputs Dashboard */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '15px',
                borderTop: '1px solid rgba(255,255,255,0.08)',
                paddingTop: '15px'
              }}>
                <div style={{
                  padding: '12px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(6, 182, 212, 0.05)',
                  border: '1px solid rgba(6, 182, 212, 0.15)',
                  textAlign: 'center'
                }}>
                  <div style={{ color: '#06b6d4', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase' }}>Simulated SGPA</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#ffffff', marginTop: '5px' }}>{simSGPA}</div>
                  <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: '3px' }}>Current Sem ({simSemesterCredits} Credits)</div>
                </div>

                <div style={{
                  padding: '12px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(167, 139, 250, 0.05)',
                  border: '1px solid rgba(167, 139, 250, 0.15)',
                  textAlign: 'center'
                }}>
                  <div style={{ color: '#a78bfa', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase' }}>New Forecast CGPA</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#ffffff', marginTop: '5px' }}>{simCGPA}</div>
                  <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: '3px' }}>Cumulative ({newTotalCredits} Credits)</div>
                </div>
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}

export default PerformancePredictor;
