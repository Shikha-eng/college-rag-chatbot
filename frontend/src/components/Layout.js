import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import LoadingSpinner from './LoadingSpinner';

const Layout = ({ children, showHeader = true, showFooter = true }) => {
  const { user, isAuthenticated, logout, isAdmin } = useAuth();
  const { currentLanguage, getLanguageNames, changeLanguage, getRTLClass } = useLanguage();

  const handleLogout = () => {
    logout();
  };

  const handleLanguageChange = (e) => {
    changeLanguage(e.target.value);
  };

  return (
    <div className={`min-h-screen bg-gray-50 ${getRTLClass()}`}>
      {showHeader && (
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              {/* Logo and Title */}
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">CC</span>
                  </div>
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">
                    College Chatbot
                  </h1>
                  <p className="text-xs text-gray-500">
                    Multilingual Support Assistant
                  </p>
                </div>
              </div>

              {/* Navigation and User Menu */}
              <div className="flex items-center space-x-4">
                {/* Language Selector */}
                <div className="relative">
                  <select
                    value={currentLanguage}
                    onChange={handleLanguageChange}
                    className="appearance-none bg-white border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {getLanguageNames().map((lang) => (
                      <option key={lang.key} value={lang.key}>
                        {lang.nativeName}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {/* User Menu */}
                {isAuthenticated && user && (
                  <div className="flex items-center space-x-4">
                    {/* Navigation Links */}
                    <nav className="hidden md:flex space-x-4">
                      <a
                        href="/chat"
                        className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                      >
                        Chat
                      </a>
                      {isAdmin() && (
                        <>
                          <a
                            href="/admin/dashboard"
                            className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                          >
                            Dashboard
                          </a>
                          <a
                            href="/admin/questions"
                            className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                          >
                            Questions
                          </a>
                        </>
                      )}
                    </nav>

                    {/* User Info */}
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-sm font-medium">
                            {user.name?.charAt(0).toUpperCase() || 'U'}
                          </span>
                        </div>
                        <div className="hidden md:block">
                          <div className="text-sm font-medium text-gray-900">
                            {user.name}
                          </div>
                          <div className="text-xs text-gray-500 capitalize">
                            {user.role}
                          </div>
                        </div>
                      </div>

                      {/* Logout Button */}
                      <button
                        onClick={handleLogout}
                        className="text-gray-400 hover:text-gray-600 p-2 rounded-md hover:bg-gray-100 transition-colors"
                        title="Logout"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}

                {/* Login Button for Unauthenticated Users */}
                {!isAuthenticated && (
                  <div className="flex items-center space-x-2">
                    <a
                      href="/login"
                      className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                    >
                      Login
                    </a>
                    <a
                      href="/register"
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                    >
                      Sign Up
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Mobile Navigation */}
          {isAuthenticated && user && (
            <div className="md:hidden border-t border-gray-200 bg-gray-50">
              <div className="px-4 py-3 space-y-1">
                <a
                  href="/chat"
                  className="block px-3 py-2 text-base font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md"
                >
                  Chat
                </a>
                {isAdmin() && (
                  <>
                    <a
                      href="/admin/dashboard"
                      className="block px-3 py-2 text-base font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md"
                    >
                      Dashboard
                    </a>
                    <a
                      href="/admin/questions"
                      className="block px-3 py-2 text-base font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md"
                    >
                      Questions
                    </a>
                  </>
                )}
              </div>
            </div>
          )}
        </header>
      )}

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      {showFooter && (
        <footer className="bg-white border-t border-gray-200 mt-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
              <div className="flex items-center space-x-4">
                <div className="w-6 h-6 bg-gradient-to-r from-blue-600 to-purple-600 rounded flex items-center justify-center">
                  <span className="text-white font-bold text-xs">CC</span>
                </div>
                <div className="text-sm text-gray-600">
                  © 2024 College Chatbot. All rights reserved.
                </div>
              </div>
              
              <div className="flex items-center space-x-6 text-sm text-gray-500">
                <a href="/privacy" className="hover:text-gray-700 transition-colors">
                  Privacy Policy
                </a>
                <a href="/terms" className="hover:text-gray-700 transition-colors">
                  Terms of Service
                </a>
                <a href="/help" className="hover:text-gray-700 transition-colors">
                  Help
                </a>
              </div>
              
              <div className="flex items-center space-x-2 text-xs text-gray-500">
                <span>Status:</span>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span>Online</span>
                </div>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="text-center text-xs text-gray-400">
                Powered by advanced AI technology • Supports 6+ languages • Available 24/7
              </div>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
};

export default Layout;