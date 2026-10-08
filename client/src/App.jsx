import React, { lazy, Suspense, useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { getCurrentUser } from './utils/auth';
import Login from './pages/Login';
import SignupPage from './pages/SignupPage';
const StudentPortal = lazy(() => import('./pages/StudentPortal')); 
const FacultyPortal = lazy(() => import('./pages/FacultyPortal')); 
const AdminPortal = lazy(() => import('./pages/AdminPortal')); 
import './index.css';

// Apply saved theme on page load (before first render)
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'dark') {
  document.documentElement.classList.add('dark');
} else {
  document.documentElement.classList.remove('dark');
}

function ProtectedRoute({ children, requiredRole }) {
  const [user, setUser] = useState(getCurrentUser);
  useEffect(() => {
    const endSession = () => setUser(null);
    window.addEventListener('apms-session-ended', endSession);
    return () => window.removeEventListener('apms-session-ended', endSession);
  }, []);
  if (!user) return <Navigate to="/" replace />;
  if (requiredRole && user.role !== requiredRole) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div role="status" className="page-content">Loading your workspace…</div>}><Routes>
        <Route path="/" element={<Login />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/student" element={
          <ProtectedRoute requiredRole="student"><StudentPortal /></ProtectedRoute>
        } />
        <Route path="/faculty" element={
          <ProtectedRoute requiredRole="faculty"><FacultyPortal /></ProtectedRoute>
        } />
        <Route path="/admin" element={
          <ProtectedRoute requiredRole="admin"><AdminPortal /></ProtectedRoute>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes></Suspense>
    </BrowserRouter>
  );
}

