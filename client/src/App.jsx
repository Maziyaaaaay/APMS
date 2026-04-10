import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { getCurrentUser } from './utils/auth';
import Login from './pages/Login';
import SignupPage from './pages/SignupPage';
import StudentPortal from './pages/StudentPortal';
import FacultyPortal from './pages/FacultyPortal';
import AdminPortal from './pages/AdminPortal';
import './index.css';

// Apply saved theme on page load (before first render)
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'dark') {
  document.documentElement.classList.add('dark');
} else {
  document.documentElement.classList.remove('dark');
}

function ProtectedRoute({ children, requiredRole }) {
  const user = getCurrentUser();
  if (!user) return <Navigate to="/" replace />;
  if (requiredRole && user.role !== requiredRole) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
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
      </Routes>
    </BrowserRouter>
  );
}
