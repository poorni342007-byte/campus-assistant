import React, { useState, useEffect } from 'react';
import { GraduationCap, Users, CalendarCheck, Loader2 } from 'lucide-react';
import { api } from '../../api';

function TeacherHome({ user }) {
  const [stats, setStats] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsData, annData] = await Promise.all([
          api.get('/api/teacher/stats').catch(() => null),
          api.get(`/api/dashboard/announcements?student_id=${user.id}`).catch(() => [])
        ]);
        if (statsData) setStats(statsData);
        if (annData) setAnnouncements(annData.slice(0, 5));
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user?.id]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
        <Loader2 className="animate-spin" size={36} style={{ color: '#06b6d4' }} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>

      {/* Welcome */}
      <div className="info-card" style={{ maxWidth: 'none', background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.08) 0%, rgba(99, 102, 241, 0.08) 100%)', border: '1px solid rgba(6, 182, 212, 0.15)' }}>
        <h2 style={{ fontSize: '1.8rem', color: '#ffffff' }}>Welcome, {user?.full_name} 📚</h2>
        <p style={{ color: '#94a3b8', marginTop: '5px' }}>
          {user?.department ? `Department: ${user.department}` : 'Your teaching dashboard'}. Mark attendance for your assigned subjects and review student performance.
        </p>
      </div>

      {/* Stats */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
          <div className="info-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '0.85rem', color: '#a78bfa', fontWeight: '600', textTransform: 'uppercase' }}>My Subjects</span>
              <GraduationCap size={20} style={{ color: '#a78bfa' }} />
            </div>
            <h3 style={{ fontSize: '2.5rem', fontWeight: '800', color: '#ffffff' }}>{stats.total_subjects || 0}</h3>
          </div>

          <div className="info-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '0.85rem', color: '#06b6d4', fontWeight: '600', textTransform: 'uppercase' }}>Total Students</span>
              <Users size={20} style={{ color: '#06b6d4' }} />
            </div>
            <h3 style={{ fontSize: '2.5rem', fontWeight: '800', color: '#ffffff' }}>{stats.total_students || 0}</h3>
          </div>

          <div className="info-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '0.85rem', color: '#34d399', fontWeight: '600', textTransform: 'uppercase' }}>Classes This Week</span>
              <CalendarCheck size={20} style={{ color: '#34d399' }} />
            </div>
            <h3 style={{ fontSize: '2.5rem', fontWeight: '800', color: '#ffffff' }}>{stats.classes_this_week || 0}</h3>
          </div>
        </div>
      )}

      {/* Subject List */}
      {stats?.subjects && stats.subjects.length > 0 && (
        <div className="info-card" style={{ maxWidth: 'none', padding: '25px' }}>
          <h3 style={{ fontSize: '1.2rem', color: '#ffffff', marginBottom: '20px' }}>Assigned Subjects</h3>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {stats.subjects.map((sub, i) => (
              <span key={i} style={{
                fontSize: '0.85rem', padding: '8px 16px', borderRadius: '10px',
                backgroundColor: 'rgba(6,182,212,0.08)', color: '#06b6d4', border: '1px solid rgba(6,182,212,0.15)',
                fontWeight: '600'
              }}>
                {sub}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Recent Announcements */}
      {announcements.length > 0 && (
        <div className="info-card" style={{ maxWidth: 'none', padding: '25px' }}>
          <h3 style={{ fontSize: '1.2rem', color: '#ffffff', marginBottom: '20px' }}>Recent Announcements</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {announcements.map(ann => (
              <div key={ann.id} style={{
                padding: '14px 18px', borderRadius: '10px',
                backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
                borderLeft: ann.priority === 'High' ? '4px solid #ef4444' : '4px solid #3b82f6'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                  <strong style={{ color: '#ffffff', fontSize: '0.95rem' }}>{ann.title}</strong>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{ann.date}</span>
                </div>
                <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: '1.4' }}>{ann.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default TeacherHome;
