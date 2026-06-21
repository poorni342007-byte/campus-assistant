import React, { useState, useEffect } from 'react';
import { Users, TrendingUp, GraduationCap, Loader2 } from 'lucide-react';
import { api } from '../../api';

function AdminHome({ user }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const data = await api.get('/api/admin/metrics');
        setStats(data);
      } catch (err) {
        setError(err.message || 'Failed to load metrics.');
      } finally {
        setLoading(false);
      }
    };
    fetchMetrics();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
        <Loader2 className="animate-spin" size={36} style={{ color: '#06b6d4' }} />
        <span style={{ marginLeft: '12px', color: '#94a3b8' }}>Loading Campus Metrics...</span>
      </div>
    );
  }

  if (error) return <div className="alert alert-error">⚠️ {error}</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>

      {/* Welcome Banner */}
      <div className="info-card" style={{ maxWidth: 'none', background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(99, 102, 241, 0.08) 100%)', border: '1px solid rgba(239, 68, 68, 0.15)' }}>
        <h2 style={{ fontSize: '1.8rem', color: '#ffffff' }}>Welcome, {user?.full_name} 🛡️</h2>
        <p style={{ color: '#94a3b8', marginTop: '5px' }}>
          Here is a snapshot of the campus-wide academic standings. Use the sidebar to manage students, teachers, and announcements.
        </p>
      </div>

      {/* Metrics Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>

        <div className="info-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.85rem', color: '#06b6d4', fontWeight: '600', textTransform: 'uppercase' }}>Total Students</span>
            <Users size={20} style={{ color: '#06b6d4' }} />
          </div>
          <h3 style={{ fontSize: '2.5rem', fontWeight: '800', color: '#ffffff' }}>{stats?.total_students || 0}</h3>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '5px' }}>Registered student accounts</p>
        </div>

        <div className="info-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.85rem', color: '#a78bfa', fontWeight: '600', textTransform: 'uppercase' }}>Avg CGPA</span>
            <TrendingUp size={20} style={{ color: '#a78bfa' }} />
          </div>
          <h3 style={{ fontSize: '2.5rem', fontWeight: '800', color: '#ffffff' }}>{stats?.avg_cgpa || '0.00'}</h3>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '5px' }}>Campus-wide average</p>
        </div>

        <div className="info-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.85rem', color: '#34d399', fontWeight: '600', textTransform: 'uppercase' }}>Avg Attendance</span>
            <GraduationCap size={20} style={{ color: '#34d399' }} />
          </div>
          <h3 style={{ fontSize: '2.5rem', fontWeight: '800', color: '#ffffff' }}>{stats?.avg_attendance || '0.0'}%</h3>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '5px' }}>Campus-wide average</p>
        </div>

      </div>

      {/* Risk Distribution */}
      {stats?.risk_distribution && (
        <div className="info-card" style={{ maxWidth: 'none', padding: '25px' }}>
          <h3 style={{ fontSize: '1.3rem', color: '#ffffff', marginBottom: '20px' }}>Student Risk Distribution</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
            <div style={{ padding: '18px', borderRadius: '12px', backgroundColor: 'rgba(16, 185, 129, 0.06)', border: '1px solid rgba(16, 185, 129, 0.15)', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: '800', color: '#34d399' }}>{stats.risk_distribution.stable || 0}</div>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase', marginTop: '5px' }}>Stable</div>
            </div>
            <div style={{ padding: '18px', borderRadius: '12px', backgroundColor: 'rgba(245, 158, 11, 0.06)', border: '1px solid rgba(245, 158, 11, 0.15)', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: '800', color: '#fbbf24' }}>{stats.risk_distribution.warning || 0}</div>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase', marginTop: '5px' }}>Warning</div>
            </div>
            <div style={{ padding: '18px', borderRadius: '12px', backgroundColor: 'rgba(239, 68, 68, 0.06)', border: '1px solid rgba(239, 68, 68, 0.15)', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: '800', color: '#f87171' }}>{stats.risk_distribution.critical || 0}</div>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase', marginTop: '5px' }}>High Risk</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminHome;
