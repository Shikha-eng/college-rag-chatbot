import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from './LoadingSpinner';

const ProtectedRoute = ({ 
  children, 
  requireAuth = true, 
  requireAdmin = false, 
  redirectTo = '/login' 
}) => {
  const { isAuthenticated, isAdmin, user, isLoading } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // If authentication is required but user is not authenticated
  if (requireAuth && !isAuthenticated()) {
    return (
      <Navigate 
        to={redirectTo} 
        state={{ from: location.pathname }} 
        replace 
      />
    );
  }

  // If admin access is required but user is not admin
  if (requireAdmin && !isAdmin()) {
    return (
      <Navigate 
        to="/chat" 
        replace 
      />
    );
  }

  // If user is authenticated but trying to access login/register pages
  if (!requireAuth && isAuthenticated() && (location.pathname === '/login' || location.pathname === '/register')) {
    // Redirect based on user role
    const redirectPath = isAdmin() ? '/admin/dashboard' : '/chat';
    return <Navigate to={redirectPath} replace />;
  }

  // Render the protected component
  return children;
};

// Higher-order component for admin-only routes
export const AdminRoute = ({ children }) => {
  return (
    <ProtectedRoute requireAuth={true} requireAdmin={true}>
      {children}
    </ProtectedRoute>
  );
};

// Higher-order component for authenticated routes
export const AuthRoute = ({ children }) => {
  return (
    <ProtectedRoute requireAuth={true} requireAdmin={false}>
      {children}
    </ProtectedRoute>
  );
};

// Higher-order component for public routes (redirects authenticated users)
export const PublicRoute = ({ children }) => {
  return (
    <ProtectedRoute requireAuth={false}>
      {children}
    </ProtectedRoute>
  );
};

export default ProtectedRoute;