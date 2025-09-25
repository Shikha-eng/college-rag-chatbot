import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Context providers
import { AuthProvider } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';

// Pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ChatPage from './pages/ChatPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminQuestions from './pages/admin/AdminQuestions';
import AdminUsers from './pages/admin/AdminUsers';
import AdminAnalytics from './pages/admin/AdminAnalytics';

// Components
import ProtectedRoute, { AdminRoute, AuthRoute, PublicRoute } from './components/ProtectedRoute';
import LoadingSpinner from './components/LoadingSpinner';

function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <Router>
          <div className="App min-h-screen bg-gray-50">
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#ffffff',
                  color: '#1f2937',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                },
                success: {
                  style: {
                    borderColor: '#10b981',
                  },
                },
                error: {
                  style: {
                    borderColor: '#ef4444',
                  },
                },
              }}
            />
            
            <Routes>
              {/* Public routes */}
              <Route 
                path="/login" 
                element={
                  <PublicRoute>
                    <LoginPage />
                  </PublicRoute>
                } 
              />
              <Route 
                path="/register" 
                element={
                  <PublicRoute>
                    <RegisterPage />
                  </PublicRoute>
                } 
              />
              
              {/* Protected routes */}
              <Route 
                path="/chat" 
                element={
                  <AuthRoute>
                    <ChatPage />
                  </AuthRoute>
                } 
              />
              
              {/* Admin routes */}
              <Route 
                path="/admin/dashboard" 
                element={
                  <AdminRoute>
                    <AdminDashboard />
                  </AdminRoute>
                } 
              />
              
              <Route 
                path="/admin/questions" 
                element={
                  <AdminRoute>
                    <AdminQuestions />
                  </AdminRoute>
                } 
              />
              
              <Route 
                path="/admin/users" 
                element={
                  <AdminRoute>
                    <AdminUsers />
                  </AdminRoute>
                } 
              />
              
              <Route 
                path="/admin/analytics" 
                element={
                  <AdminRoute>
                    <AdminAnalytics />
                  </AdminRoute>
                } 
              />
              
              {/* Default redirect */}
              <Route 
                path="/" 
                element={<Navigate to="/login" replace />} 
              />
              
              {/* Catch all route */}
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </div>
        </Router>
      </LanguageProvider>
    </AuthProvider>
  );
}

// App wrapper to handle loading state
function AppWrapper() {
  return (
    <React.Suspense fallback={<LoadingSpinner fullScreen />}>
      <App />
    </React.Suspense>
  );
}

export default AppWrapper;