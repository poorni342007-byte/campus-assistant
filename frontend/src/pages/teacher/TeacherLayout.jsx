import React, { useState, useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  CalendarCheck,
  Users,
  Settings,
  LogOut,
  Menu,
  X
} from 'lucide-react';

function TeacherLayout({ user, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login');
    } else if (user.role !== 'teacher') {
      if (user.role === 'student') navigate('/dashboard');
      else if (user.role === 'admin') navigate('/admin');
    }
    // Force password change intercept
    if (user?.force_password_change && location.pathname !== '/change-password') {
      navigate('/change-password');
    }
  }, [user, navigate, location.pathname]);

  if (!user || user.role !== 'teacher') return null;

  const menuItems = [
    { id: '', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
    { id: 'attendance', label: 'Subject Attendance', icon: <CalendarCheck size={18} /> },
    { id: 'students', label: 'Student Overview', icon: <Users size={18} /> },
    { id: 'settings', label: 'Account Settings', icon: <Settings size={18} /> }
  ];

  const getActiveTitle = () => {
    const currentPath = location.pathname.replace('/teacher', '').replace('/', '');
    const activeItem = menuItems.find(item => item.id === currentPath);
    return activeItem ? activeItem.label : 'Teacher Dashboard';
  };

  return (
    <div className="dashboard-layout">
      <header className="mobile-header">
        <div className="sidebar-brand" style={{ marginBottom: 0 }}>
          <span>CampusAI Teacher</span>
        </div>
        <button className="hamburger-btn" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      <aside className={`sidebar ${mobileMenuOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <span>CampusAI Teacher</span>
        </div>

        <div className="user-profile">
          <div className="name">{user.full_name}</div>
          {user.department && (
            <div style={{ fontSize: '0.8rem', color: '#06b6d4', fontWeight: '600', marginTop: '2px' }}>
              {user.department}
            </div>
          )}
          <div className="email" style={{ marginTop: '4px' }}>{user.email}</div>
        </div>

        <ul className="nav-menu">
          {menuItems.map((item) => {
            const path = `/teacher${item.id ? '/' + item.id : ''}`;
            const isActive = location.pathname === path || (item.id === '' && location.pathname === '/teacher');
            return (
              <li key={item.id}>
                <Link to={path} className={`nav-item ${isActive ? 'active' : ''}`} onClick={() => setMobileMenuOpen(false)}>
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>

        <button className="logout-btn" onClick={onLogout}>
          <LogOut size={18} /> Logout
        </button>
      </aside>

      <main className="main-content">
        <header className="content-header">
          <h1>{getActiveTitle()}</h1>
          <p>CampusAI Teacher Workspace</p>
        </header>
        <section>
          <Outlet />
        </section>
      </main>
    </div>
  );
}

export default TeacherLayout;
