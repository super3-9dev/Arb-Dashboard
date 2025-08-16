import React from 'react';
import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const token = localStorage.getItem('authToken');
  
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // Validate token format (basic JWT check)
  if (token.split('.').length !== 3) {
    localStorage.removeItem('authToken');
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
