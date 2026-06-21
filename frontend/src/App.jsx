import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { api } from './api';

// Auth Pages
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import ResetPassword from './pages/ResetPassword.jsx';
import ChangePassword from './pages/ChangePassword.jsx';

// Student Workspace Components
import StudentLayout from './pages/student/StudentLayout.jsx';
import StudentHome from './pages/student/StudentHome.jsx';
import AttendanceTracker from './pages/student/AttendanceTracker.jsx';
import CgpaCalculator from './pages/student/CgpaCalculator.jsx';
import Chatbot from './pages/student/Chatbot.jsx';
import PerformancePredictor from './pages/student/PerformancePredictor.jsx';
import ResumeAnalyzer from './pages/student/ResumeAnalyzer.jsx';
import StudyPlanner from './pages/student/StudyPlanner.jsx';
import Profile from './pages/student/Profile.jsx';

// Teacher Workspace Components
import TeacherLayout from './pages/teacher/TeacherLayout.jsx';
import TeacherHome from './pages/teacher/TeacherHome.jsx';
import SubjectAttendance from './pages/teacher/SubjectAttendance.jsx';
import StudentOverview from './pages/teacher/StudentOverview.jsx';
import TeacherAccountSettings from './pages/teacher/AccountSettings.jsx';

// Admin Workspace Components
import AdminLayout from './pages/admin/AdminLayout.jsx';
import AdminHome from './pages/admin/AdminHome.jsx';
import StudentRoster from './pages/admin/StudentRoster.jsx';
import TeacherManagement from './pages/admin/TeacherManagement.jsx';
import AnnouncementManager from './pages/admin/AnnouncementManager.jsx';
import AdminAccountSettings from './pages/admin/AccountSettings.jsx';

function App() {
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Check if user session already exists on load
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
      }
    }
    setCheckingAuth(false);
  }, []);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
  };

  const handleLogout = async () => {
    try {
      await api.post('/api/logout');
    } catch (err) {
      console.error("Failed to delete session on backend during logout:", err);
    }
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setUser(null);
  };

  if (checkingAuth) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#020806',
        color: '#10b981',
        fontSize: '1.2rem',
        fontFamily: 'Outfit, sans-serif'
      }}>
        🎓 Loading CampusAI...
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {/* Unauthenticated routes */}
        <Route 
          path="/login" 
          element={
            !user ? (
              <Login onLoginSuccess={handleLoginSuccess} />
            ) : (
              <Navigate to={user.role === 'admin' ? '/admin' : user.role === 'teacher' ? '/teacher' : '/dashboard'} replace />
            )
          } 
        />
        <Route 
          path="/register" 
          element={
            !user ? (
              <Register />
            ) : (
              <Navigate to={user.role === 'admin' ? '/admin' : user.role === 'teacher' ? '/teacher' : '/dashboard'} replace />
            )
          } 
        />
        <Route 
          path="/forgot-password" 
          element={
            !user ? (
              <div className="auth-container">
                <ForgotPassword />
              </div>
            ) : (
              <Navigate to="/" replace />
            )
          } 
        />
        <Route 
          path="/reset-password" 
          element={
            !user ? (
              <div className="auth-container">
                <ResetPassword />
              </div>
            ) : (
              <Navigate to="/" replace />
            )
          } 
        />

        {/* Authenticated general routes */}
        <Route 
          path="/change-password" 
          element={
            user ? (
              <ChangePassword user={user} />
            ) : (
              <Navigate to="/login" replace />
            )
          } 
        />

        {/* Role-based workspace routes */}
        <Route 
          path="/dashboard" 
          element={
            user && user.role === 'student' ? (
              <StudentLayout user={user} onLogout={handleLogout} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        >
          <Route index element={<StudentHome user={user} />} />
          <Route path="attendance" element={<AttendanceTracker user={user} />} />
          <Route path="cgpa" element={<CgpaCalculator user={user} />} />
          <Route path="chatbot" element={<Chatbot user={user} />} />
          <Route path="performance" element={<PerformancePredictor user={user} />} />
          <Route path="resume" element={<ResumeAnalyzer user={user} />} />
          <Route path="study-planner" element={<StudyPlanner user={user} />} />
          <Route path="profile" element={<Profile user={user} />} />
        </Route>

        <Route 
          path="/teacher" 
          element={
            user && user.role === 'teacher' ? (
              <TeacherLayout user={user} onLogout={handleLogout} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        >
          <Route index element={<TeacherHome user={user} />} />
          <Route path="attendance" element={<SubjectAttendance user={user} />} />
          <Route path="students" element={<StudentOverview user={user} />} />
          <Route path="settings" element={<TeacherAccountSettings user={user} />} />
        </Route>

        <Route 
          path="/admin" 
          element={
            user && user.role === 'admin' ? (
              <AdminLayout user={user} onLogout={handleLogout} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        >
          <Route index element={<AdminHome user={user} />} />
          <Route path="roster" element={<StudentRoster user={user} />} />
          <Route path="teachers" element={<TeacherManagement user={user} />} />
          <Route path="announcements" element={<AnnouncementManager user={user} />} />
          <Route path="settings" element={<AdminAccountSettings user={user} />} />
        </Route>

        <Route 
          path="/" 
          element={
            user ? (
              <Navigate to={user.role === 'admin' ? '/admin' : user.role === 'teacher' ? '/teacher' : '/dashboard'} replace />
            ) : (
              <Navigate to="/login" replace />
            )
          } 
        />

        {/* Catch-all fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
