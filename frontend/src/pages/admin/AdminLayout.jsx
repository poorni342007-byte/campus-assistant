import React, { useState, useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  Megaphone,
  Settings,
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { api } from '../../api';

function AdminLayout({ user, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login');
    } else if (user.role !== 'admin') {
      if (user.role === 'student') navigate('/dashboard');
      else if (user.role === 'teacher') navigate('/teacher');
    }
  }, [user, navigate]);

  if (!user || user.role !== 'admin') return null;

  const menuItems = [
    { id: '', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
    { id: 'roster', label: 'Student Roster', icon: <Users size={18} /> },
    { id: 'teachers', label: 'Teacher Management', icon: <GraduationCap size={18} /> },
    { id: 'announcements', label: 'Announcements', icon: <Megaphone size={18} /> },
    { id: 'settings', label: 'Account Settings', icon: <Settings size={18} /> }
  ];

  const getActiveTitle = () => {
    const currentPath = location.pathname.replace('/admin', '').replace('/', '');
    const activeItem = menuItems.find(item => item.id === currentPath);
    return activeItem ? activeItem.label : 'Admin Dashboard';
  };

  return (
    <div className="dashboard-layout">
      {/* Mobile Top Header */}
      <header className="mobile-header">
        <div className="sidebar-brand" style={{ marginBottom: 0 }}>
          <span>CampusAI Admin</span>
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
          <span>CampusAI Admin</span>
        </div>

        <div className="user-profile">
          <div className="name">{user.full_name}</div>
          <div style={{ fontSize: '0.75rem', color: '#f87171', fontWeight: '700', marginTop: '2px', textTransform: 'uppercase' }}>
            Administrator
          </div>
          <div className="email" style={{ marginTop: '4px' }}>{user.email}</div>
        </div>

        <ul className="nav-menu">
          {menuItems.map((item) => {
            const path = `/admin${item.id ? '/' + item.id : ''}`;
            const isActive = location.pathname === path || (item.id === '' && location.pathname === '/admin');

            return (
              <li key={item.id}>
                <Link
                  to={path}
                  className={`nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => setMobileMenuOpen(false)}
                >
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

      {/* Main Panel Viewport */}
      <main className="main-content">
        <header className="content-header">
          <h1>{getActiveTitle()}</h1>
          <p>CampusAI Administration Panel</p>
        </header>

        <section>
          <Outlet />
        </section>
      </main>
    </div>
  );
}

export default AdminLayout;
