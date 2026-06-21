import React, { useState, useEffect } from 'react';
import { useNavigate, useOutletContext, Link } from 'react-router-dom';
import { 
  Calculator, 
  CalendarCheck, 
  ClipboardList, 
  Calendar, 
  ChevronRight, 
  Loader2 
} from 'lucide-react';
import { api } from '../../api';

function StudentHome({ user }) {
  const navigate = useNavigate();
  const { checkUnreadAnnouncements } = useOutletContext();
  
  const [stats, setStats] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboardData = async () => {
    if (!user?.id) return;
    setLoading(true);
    setError('');

    try {
      const [statsData, announcementsData] = await Promise.all([
        api.get(`/api/dashboard/stats?student_id=${user.id}`),
        api.get(`/api/dashboard/announcements?student_id=${user.id}`)
      ]);

      setStats(statsData);
      setAnnouncements(announcementsData);
    } catch (err) {
      setError(err.message || 'Error fetching data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [user?.id]);

  // Mark announcements as read
  useEffect(() => {
    if (announcements.length > 0) {
      const readStr = localStorage.getItem('readAnnouncements') || '[]';
      const readIds = JSON.parse(readStr);
      let updated = false;
      
      announcements.forEach(ann => {
        if (!readIds.includes(ann.id)) {
          readIds.push(ann.id);
          updated = true;
        }
      });
      
      if (updated) {
        localStorage.setItem('readAnnouncements', JSON.stringify(readIds));
        if (checkUnreadAnnouncements) {
          checkUnreadAnnouncements();
        }
      }
    }
  }, [announcements, checkUnreadAnnouncements]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
        <Loader2 className="animate-spin" size={36} style={{ color: '#06b6d4' }} />
        <span style={{ marginLeft: '12px', color: '#94a3b8' }}>Loading Workspace Stats...</span>
      </div>
    );
  }

  if (error) {
    return <div className="alert alert-error">⚠️ {error}</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      {/* Greetings Banner */}
      <div className="info-card" style={{ maxWidth: 'none', background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(6, 182, 212, 0.05) 100%)', border: '1px solid rgba(6, 182, 212, 0.15)' }}>
        <h2 style={{ fontSize: '1.8rem', color: '#ffffff' }}>Welcome back, {user?.full_name}! 👋</h2>
        <p style={{ color: '#94a3b8', marginTop: '5px' }}>
          Here is a quick summary of your academic dashboard. Use the cards below to quickly access toolsets.
        </p>
      </div>

      {/* 3-Card Metrics Grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
        gap: '20px' 
      }}>
        {/* CGPA Card */}
        <div className="info-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <span style={{ fontSize: '0.85rem', color: '#a78bfa', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Academics</span>
              <Calculator size={20} style={{ color: '#a78bfa' }} />
            </div>
            <h3 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '5px' }}>{stats?.cgpa} <span style={{ fontSize: '1rem', color: '#64748b' }}>/ {stats?.cgpa_max}</span></h3>
            <p style={{ color: '#cbd5e1', fontSize: '0.95rem', marginBottom: '15px' }}>Current Cumulative Grade Point Average</p>
            
            {/* Progress Bar */}
            <div style={{ width: '100%', height: '6px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden', marginBottom: '20px' }}>
              <div style={{ width: `${(stats?.cgpa / stats?.cgpa_max) * 100}%`, height: '100%', background: 'linear-gradient(90deg, #a78bfa, #818cf8)', borderRadius: '3px' }}></div>
            </div>
          </div>
          
          <Link to="/dashboard/cgpa" style={{ color: '#a78bfa', display: 'flex', alignItems: 'center', fontSize: '0.9rem', fontWeight: '600', textDecoration: 'none' }}>
            CGPA Calculator <ChevronRight size={16} style={{ marginLeft: '4px' }} />
          </Link>
        </div>

        {/* Attendance Card */}
        <div className="info-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <span style={{ fontSize: '0.85rem', color: '#06b6d4', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Attendance</span>
              <CalendarCheck size={20} style={{ color: '#06b6d4' }} />
            </div>
            <h3 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '5px' }}>
              {stats?.attendance_percentage}% 
              <span style={{ 
                fontSize: '0.75rem', 
                marginLeft: '10px', 
                padding: '3px 8px', 
                borderRadius: '12px', 
                backgroundColor: stats?.attendance_percentage >= 75 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                color: stats?.attendance_percentage >= 75 ? '#34d399' : '#fca5a5',
                border: stats?.attendance_percentage >= 75 ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(239, 68, 68, 0.2)'
              }}>
                {stats?.attendance_status}
              </span>
            </h3>
            <p style={{ color: '#cbd5e1', fontSize: '0.95rem', marginBottom: '15px' }}>Average Class Attendance Health</p>
            
            {/* Progress Bar */}
            <div style={{ width: '100%', height: '6px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden', marginBottom: '20px' }}>
              <div style={{ width: `${stats?.attendance_percentage}%`, height: '100%', background: stats?.attendance_percentage >= 75 ? 'linear-gradient(90deg, #06b6d4, #10b981)' : 'linear-gradient(90deg, #ef4444, #f59e0b)', borderRadius: '3px' }}></div>
            </div>
          </div>
          
          <Link to="/dashboard/attendance" style={{ color: '#06b6d4', display: 'flex', alignItems: 'center', fontSize: '0.9rem', fontWeight: '600', textDecoration: 'none' }}>
            Track Attendance <ChevronRight size={16} style={{ marginLeft: '4px' }} />
          </Link>
        </div>

        {/* AI Task Card */}
        <div className="info-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <span style={{ fontSize: '0.85rem', color: '#6366f1', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Study Planner</span>
              <ClipboardList size={20} style={{ color: '#6366f1' }} />
            </div>
            <h3 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '5px' }}>{stats?.pending_tasks} <span style={{ fontSize: '1rem', color: '#64748b' }}>Pending</span></h3>
            <p style={{ color: '#cbd5e1', fontSize: '0.95rem', marginBottom: '15px' }}>Current AI Planner tasks remaining</p>
            
            {/* Progress Bar */}
            <div style={{ width: '100%', height: '6px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden', marginBottom: '20px' }}>
              <div style={{ width: '40%', height: '100%', background: 'linear-gradient(90deg, #6366f1, #d946ef)', borderRadius: '3px' }}></div>
            </div>
          </div>
          
          <Link to="/dashboard/study-planner" style={{ color: '#818cf8', display: 'flex', alignItems: 'center', fontSize: '0.9rem', fontWeight: '600', textDecoration: 'none' }}>
            Open Planner <ChevronRight size={16} style={{ marginLeft: '4px' }} />
          </Link>
        </div>
      </div>

      {/* Announcements and Updates Panel */}
      <div className="info-card" style={{ maxWidth: 'none' }}>
        <h3 style={{ fontSize: '1.3rem', fontWeight: '700', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Calendar size={18} style={{ color: '#60a5fa' }} /> Recent Announcements & Alerts
        </h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {announcements.map((ann) => (
            <div 
              key={ann.id} 
              style={{ 
                padding: '20px', 
                borderRadius: '12px', 
                backgroundColor: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.05)',
                borderLeft: ann.priority === 'High' ? '4px solid #ef4444' : '4px solid #3b82f6',
                display: 'flex',
                flexDirection: 'column',
                gap: '5px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                <h4 style={{ fontWeight: '600', color: '#ffffff', fontSize: '1.05rem' }}>{ann.title}</h4>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={{ 
                    fontSize: '0.7rem', 
                    fontWeight: '700', 
                    textTransform: 'uppercase', 
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    padding: '2px 8px',
                    borderRadius: '8px',
                    color: '#94a3b8'
                  }}>
                    {ann.type}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{ann.date}</span>
                </div>
              </div>
              <p style={{ color: '#94a3b8', fontSize: '0.95rem', lineHeight: '1.5', marginTop: '5px' }}>{ann.content}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default StudentHome;
