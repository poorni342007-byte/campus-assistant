import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { api } from '../../api';

function StudyPlanner({ user }) {
  const [studyPlans, setStudyPlans] = useState([]);
  const [plannerLoading, setPlannerLoading] = useState(false);
  const [plannerError, setPlannerError] = useState('');
  const [examStartDate, setExamStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  const [dailyHoursLimit, setDailyHoursLimit] = useState(2.0);

  // Custom session state
  const [newSessionSubject, setNewSessionSubject] = useState('');
  const [newSessionTopic, setNewSessionTopic] = useState('');
  const [newSessionDate, setNewSessionDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [newSessionDuration, setNewSessionDuration] = useState(60);
  const [addingSession, setAddingSession] = useState(false);
  const [addSessionError, setAddSessionError] = useState('');

  const fetchStudyPlans = async () => {
    if (!user?.id) return;
    setPlannerLoading(true);
    setPlannerError('');
    try {
      const data = await api.get(`/api/study-planner?student_id=${user.id}`);
      setStudyPlans(data);
    } catch (err) {
      setPlannerError(err.message || 'Error loading study plans.');
    } finally {
      setPlannerLoading(false);
    }
  };

  useEffect(() => {
    fetchStudyPlans();
  }, [user?.id]);

  const handleGeneratePlan = async (e) => {
    if (e) e.preventDefault();
    if (!user?.id) return;
    setPlannerLoading(true);
    setPlannerError('');
    try {
      const data = await api.post('/api/study-planner/generate', {
        student_id: user.id,
        exam_start_date: examStartDate,
        daily_hours: parseFloat(dailyHoursLimit)
      });
      setStudyPlans(data);
    } catch (err) {
      setPlannerError(err.message || 'Error generating study plan.');
    } finally {
      setPlannerLoading(false);
    }
  };

  const handleToggleCompleteTask = async (taskId, currentStatus) => {
    try {
      await api.put(`/api/study-planner/${taskId}`, {
        is_completed: !currentStatus
      });
      setStudyPlans(prev => prev.map(task =>
        task.id === taskId ? { ...task, is_completed: !currentStatus } : task
      ));
    } catch (err) {
      alert(err.message);
    }
  };

  const handleAddCustomSession = async (e) => {
    if (e) e.preventDefault();
    if (!newSessionSubject.trim() || !newSessionTopic.trim()) {
      setAddSessionError('Subject and topic are required.');
      return;
    }
    setAddingSession(true);
    setAddSessionError('');
    try {
      const data = await api.post('/api/study-planner', {
        student_id: user.id,
        subject_name: newSessionSubject.trim(),
        topic: newSessionTopic.trim(),
        study_date: newSessionDate,
        duration_minutes: parseInt(newSessionDuration) || 60
      });
      setStudyPlans(prev => {
        const updated = [...prev, data];
        return updated.sort((a, b) => new Date(a.study_date) - new Date(b.study_date));
      });
      setNewSessionSubject('');
      setNewSessionTopic('');
    } catch (err) {
      setAddSessionError(err.message || 'Error adding study task.');
    } finally {
      setAddingSession(false);
    }
  };

  const handleDeleteSession = async (taskId) => {
    if (!confirm('Are you sure you want to delete this study session?')) return;
    try {
      await api.delete(`/api/study-planner/${taskId}`);
      setStudyPlans(prev => prev.filter(task => task.id !== taskId));
    } catch (err) {
      alert(err.message);
    }
  };

  const groupedPlans = studyPlans.reduce((groups, plan) => {
    const date = plan.study_date;
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(plan);
    return groups;
  }, {});

  const totalTasks = studyPlans.length;
  const completedTasks = studyPlans.filter(p => p.is_completed).length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const totalHours = (studyPlans.reduce((sum, p) => sum + (p.is_completed ? p.duration_minutes : 0), 0) / 60).toFixed(1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px', maxWidth: '1000px', margin: '0 auto' }}>

      {/* Intro Card */}
      <div className="info-card" style={{ maxWidth: 'none', background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(6, 182, 212, 0.05) 100%)', border: '1px solid rgba(6, 182, 212, 0.1)' }}>
        <h2 style={{ fontSize: '1.5rem', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '1.4rem' }}>📅</span> AI Exam Study Planner
        </h2>
        <p style={{ color: '#94a3b8', fontSize: '0.95rem', marginTop: '5px' }}>
          Generate a custom study roadmap structured leading up to your exams. The planner analyzes your current attendance standings to prioritize high-risk subjects, dividing study slots dynamically within your daily limits.
        </p>
      </div>

      {/* Dashboard Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '30px', alignItems: 'flex-start' }}>

        {/* Schedule Timeline Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h3 style={{ fontSize: '1.2rem', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
            ⏳ Prep Schedule Timeline ({totalTasks} sessions)
          </h3>

          {plannerError && <div className="alert alert-error">⚠️ {plannerError}</div>}

          {plannerLoading && studyPlans.length === 0 ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
              <Loader2 className="animate-spin" size={32} style={{ color: '#06b6d4' }} />
              <span style={{ marginLeft: '12px', color: '#94a3b8' }}>Generating Schedule...</span>
            </div>
          ) : totalTasks === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: '#94a3b8', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '12px', background: 'rgba(255,255,255,0.01)' }}>
              <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '15px' }}>🗓️</span>
              No study plans generated yet. Use the control panel on the right to auto-generate or create custom sessions below!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxHeight: '700px', overflowY: 'auto', paddingRight: '10px' }}>
              {Object.keys(groupedPlans).sort().map(date => (
                <div key={date} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ fontSize: '0.9rem', color: '#a78bfa', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid rgba(167, 139, 250, 0.2)', paddingBottom: '4px', display: 'flex', justifyContent: 'space-between' }}>
                    <span>{new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{groupedPlans[date].reduce((sum, t) => sum + t.duration_minutes, 0)} mins total</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {groupedPlans[date].map(task => (
                      <div
                        key={task.id}
                        className="info-card"
                        style={{
                          maxWidth: 'none',
                          padding: '14px 18px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          borderLeft: task.is_completed ? '4px solid #34d399' : '4px solid #06b6d4',
                          background: task.is_completed ? 'rgba(52, 211, 153, 0.02)' : 'rgba(6, 182, 212, 0.02)'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                          <input
                            type="checkbox"
                            style={{ transform: 'scale(1.2)', cursor: 'pointer' }}
                            checked={task.is_completed}
                            onChange={() => handleToggleCompleteTask(task.id, task.is_completed)}
                          />
                          <div style={{ minWidth: 0 }}>
                            <h4 style={{
                              fontSize: '0.95rem',
                              color: task.is_completed ? '#94a3b8' : '#ffffff',
                              textDecoration: task.is_completed ? 'line-through' : 'none',
                              fontWeight: '700',
                              wordBreak: 'break-word'
                            }}>
                              {task.subject_name}
                            </h4>
                            <p style={{
                              fontSize: '0.8rem',
                              color: task.is_completed ? '#64748b' : '#cbd5e1',
                              marginTop: '3px',
                              textDecoration: task.is_completed ? 'line-through' : 'none',
                              wordBreak: 'break-word'
                            }}>
                              {task.topic}
                            </p>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginLeft: '10px' }}>
                          <span style={{ fontSize: '0.8rem', color: '#94a3b8', whiteSpace: 'nowrap', backgroundColor: 'rgba(255,255,255,0.05)', padding: '3px 8px', borderRadius: '8px' }}>
                            ⏱️ {task.duration_minutes} mins
                          </span>
                          <button
                            onClick={() => handleDeleteSession(task.id)}
                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1.1rem', padding: '4px', fontFamily: 'inherit' }}
                            title="Delete Session"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Controls and Custom Actions Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>

          {/* AI Generator Controls */}
          <div className="info-card" style={{ maxWidth: 'none', padding: '20px' }}>
            <h3 style={{ fontSize: '1.15rem', color: '#ffffff', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              🪄 Auto-Generate Plan
            </h3>

            <form onSubmit={handleGeneratePlan} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>First Exam Start Date</label>
                <input
                  type="date"
                  className="form-control"
                  value={examStartDate}
                  onChange={(e) => setExamStartDate(e.target.value)}
                  required
                  disabled={plannerLoading}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.75rem', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Target Daily Study Limit</span>
                  <strong style={{ color: '#06b6d4' }}>{dailyHoursLimit} hrs</strong>
                </label>
                <input
                  type="range"
                  min="1.0"
                  max="6.0"
                  step="0.5"
                  className="form-control"
                  style={{ height: '6px', padding: '0', cursor: 'pointer' }}
                  value={dailyHoursLimit}
                  onChange={(e) => setDailyHoursLimit(parseFloat(e.target.value))}
                  disabled={plannerLoading}
                />
              </div>

              <button
                type="submit"
                className="btn"
                style={{ background: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)', padding: '12px', fontSize: '0.9rem', marginTop: '5px' }}
                disabled={plannerLoading}
              >
                {plannerLoading ? 'Scheduling Slots...' : 'Re-Generate AI Study Plan 🪄'}
              </button>
            </form>
          </div>

          {/* Progress Metrics Panel */}
          <div className="info-card" style={{ maxWidth: 'none', padding: '20px' }}>
            <h3 style={{ fontSize: '1.15rem', color: '#ffffff', marginBottom: '15px' }}>
              📈 Revision Progress Metrics
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
              <div style={{ padding: '12px', borderRadius: '10px', backgroundColor: 'rgba(52, 211, 153, 0.03)', border: '1px solid rgba(52, 211, 153, 0.1)', textAlign: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: '#34d399', fontWeight: '700', textTransform: 'uppercase' }}>Completion</span>
                <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#ffffff', marginTop: '5px' }}>{completionRate}%</div>
              </div>

              <div style={{ padding: '12px', borderRadius: '10px', backgroundColor: 'rgba(6, 182, 212, 0.03)', border: '1px solid rgba(6, 182, 212, 0.1)', textAlign: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: '#06b6d4', fontWeight: '700', textTransform: 'uppercase' }}>Hours Studied</span>
                <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#ffffff', marginTop: '5px' }}>{totalHours} hrs</div>
              </div>
            </div>

            <div style={{ color: '#cbd5e1', fontSize: '0.85rem', lineHeight: '1.4' }}>
              Completed: <strong>{completedTasks}</strong> of <strong>{totalTasks}</strong> scheduled slots.
            </div>
          </div>

          {/* Add Custom Task Manual Drawer */}
          <div className="info-card" style={{ maxWidth: 'none', padding: '20px' }}>
            <h3 style={{ fontSize: '1.15rem', color: '#ffffff', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              ➕ Add Custom Session
            </h3>

            <form onSubmit={handleAddCustomSession} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Subject Name</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Mathematics II"
                  value={newSessionSubject}
                  onChange={(e) => setNewSessionSubject(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Study Topic / Goal</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Fourier Transforms practice"
                  value={newSessionTopic}
                  onChange={(e) => setNewSessionTopic(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '15px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Study Date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={newSessionDate}
                    onChange={(e) => setNewSessionDate(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Duration (mins)</label>
                  <input
                    type="number"
                    min="15"
                    step="15"
                    className="form-control"
                    value={newSessionDuration}
                    onChange={(e) => setNewSessionDuration(parseInt(e.target.value) || 60)}
                    required
                  />
                </div>
              </div>

              {addSessionError && <div className="alert alert-error" style={{ margin: 0 }}>⚠️ {addSessionError}</div>}

              <button
                type="submit"
                className="btn"
                style={{ padding: '10px', fontSize: '0.85rem', marginTop: '5px' }}
                disabled={addingSession}
              >
                {addingSession ? 'Adding...' : 'Add Study Session ➕'}
              </button>
            </form>
          </div>

        </div>

      </div>

    </div>
  );
}

export default StudyPlanner;
