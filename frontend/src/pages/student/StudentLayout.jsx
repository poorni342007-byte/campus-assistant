import React, { useState, useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  CalendarCheck, 
  Calculator, 
  MessageSquareCode, 
  BrainCircuit, 
  FileSearch, 
  CalendarDays, 
  User, 
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { api } from '../../api';

function StudentLayout({ user, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);

  // Authorization Check
  useEffect(() => {
    if (!user) {
      navigate('/login');
    } else if (user.role !== 'student') {
      if (user.role === 'admin') navigate('/admin');
      else if (user.role === 'teacher') navigate('/teacher');
    }
  }, [user, navigate]);

  const checkUnreadAnnouncements = async () => {
    if (!user?.id) return;
    try {
      const data = await api.get(`/api/dashboard/announcements?student_id=${user.id}`);
      const readStr = localStorage.getItem('readAnnouncements') || '[]';
      const readIds = JSON.parse(readStr);
      const unread = data.some(item => !readIds.includes(item.id));
      setHasUnread(unread);
    } catch (err) {
      console.error("Failed to check unread announcements:", err);
    }
  };

  useEffect(() => {
    checkUnreadAnnouncements();
  }, [user?.id, location.pathname]);

  if (!user || user.role !== 'student') {
    return null;
  }

  const menuItems = [
    { id: '', label: 'Dashboard', icon: <LayoutDashboard size={18} />, badge: hasUnread },
    { id: 'attendance', label: 'Attendance Tracker', icon: <CalendarCheck size={18} /> },
    { id: 'cgpa', label: 'CGPA Calculator', icon: <Calculator size={18} /> },
    { id: 'chatbot', label: 'AI Chatbot', icon: <MessageSquareCode size={18} /> },
    { id: 'performance', label: 'Performance Predictor', icon: <BrainCircuit size={18} /> },
    { id: 'resume', label: 'Resume Analyzer', icon: <FileSearch size={18} /> },
    { id: 'study-planner', label: 'Study Planner', icon: <CalendarDays size={18} /> },
    { id: 'profile', label: 'Profile Settings', icon: <User size={18} /> }
  ];

  const getActiveTitle = () => {
    const currentPath = location.pathname.replace('/dashboard', '').replace('/', '');
    const activeItem = menuItems.find(item => item.id === currentPath);
    return activeItem ? activeItem.label : 'Student Workspace';
  };

  return (
    <div className="dashboard-layout">
      {/* Mobile Top Header */}
      <header className="mobile-header">
        <div className="sidebar-brand" style={{ marginBottom: 0 }}>
          <span>🎓 CampusAI</span>
        </div>
        <button 
          className="hamburger-btn" 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {/* Sidebar Navigation */}
      <aside className={`sidebar ${mobileMenuOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <span>🎓 CampusAI</span>
        </div>

        {/* User profile widget */}
        <div className="user-profile">
          <div className="name">{user.full_name}</div>
          {user.reg_number && (
            <div style={{ fontSize: '0.8rem', color: '#a78bfa', fontWeight: '600', marginTop: '2px' }}>
              #{user.reg_number}
            </div>
          )}
          <div className="email" style={{ marginTop: '4px' }}>{user.email}</div>
        </div>

        {/* Navigation list */}
        <ul className="nav-menu">
          {menuItems.map((item) => {
            const path = `/dashboard${item.id ? '/' + item.id : ''}`;
            const isActive = location.pathname === path || (item.id === '' && location.pathname === '/dashboard');
            
            return (
              <li key={item.id}>
                <Link 
                  to={path}
                  className={`nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => setMobileMenuOpen(false)}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    {item.icon}
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: '#ef4444',
                      display: 'inline-block',
                      boxShadow: '0 0 8px #ef4444'
                    }}></span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Logout */}
        <button className="logout-btn" onClick={onLogout}>
          <LogOut size={18} /> Logout
        </button>
      </aside>

      {/* Main Panel Viewport */}
      <main className="main-content">
        <header className="content-header">
          <h1>{getActiveTitle()}</h1>
          <p>CampusAI Student Workspace</p>
        </header>

        <section>
          <Outlet context={{ checkUnreadAnnouncements }} />
        </section>
      </main>
    </div>
  );
}

export default StudentLayout;
