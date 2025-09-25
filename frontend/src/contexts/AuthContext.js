import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { authAPI } from '../services/api';
import { toast } from 'react-hot-toast';

// Initial state
const initialState = {
  user: null,
  token: localStorage.getItem('token'),
  isAuthenticated: false,
  isLoading: true,
  error: null,
};

// Action types
const AUTH_TYPES = {
  AUTH_START: 'AUTH_START',
  AUTH_SUCCESS: 'AUTH_SUCCESS',
  AUTH_FAIL: 'AUTH_FAIL',
  LOGOUT: 'LOGOUT',
  CLEAR_ERROR: 'CLEAR_ERROR',
  UPDATE_USER: 'UPDATE_USER',
};

// Reducer function
const authReducer = (state, action) => {
  switch (action.type) {
    case AUTH_TYPES.AUTH_START:
      return {
        ...state,
        isLoading: true,
        error: null,
      };
      
    case AUTH_TYPES.AUTH_SUCCESS:
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };
      
    case AUTH_TYPES.AUTH_FAIL:
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload,
      };
      
    case AUTH_TYPES.LOGOUT:
      return {
        ...initialState,
        isLoading: false,
      };
      
    case AUTH_TYPES.CLEAR_ERROR:
      return {
        ...state,
        error: null,
      };
      
    case AUTH_TYPES.UPDATE_USER:
      return {
        ...state,
        user: { ...state.user, ...action.payload },
      };
      
    default:
      return state;
  }
};

// Create context
const AuthContext = createContext();

// Auth provider component
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Check authentication on app load
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      
      if (token) {
        try {
          dispatch({ type: AUTH_TYPES.AUTH_START });
          
          const response = await authAPI.getProfile();
          
          dispatch({
            type: AUTH_TYPES.AUTH_SUCCESS,
            payload: {
              user: response.data.user,
              token: token,
            },
          });
        } catch (error) {
          console.error('Authentication check failed:', error);
          localStorage.removeItem('token');
          dispatch({
            type: AUTH_TYPES.AUTH_FAIL,
            payload: 'Authentication expired',
          });
        }
      } else {
        dispatch({ type: AUTH_TYPES.AUTH_FAIL, payload: null });
      }
    };

    checkAuth();
  }, []);

  // Login function
  const login = async (email, password) => {
    try {
      dispatch({ type: AUTH_TYPES.AUTH_START });
      
      const response = await authAPI.login(email, password);
      const { token, user } = response.data;
      
      // Store token in localStorage
      localStorage.setItem('token', token);
      
      dispatch({
        type: AUTH_TYPES.AUTH_SUCCESS,
        payload: { user, token },
      });
      
      toast.success(`Welcome back, ${user.name}!`);
      
      return { success: true, user };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Login failed';
      
      dispatch({
        type: AUTH_TYPES.AUTH_FAIL,
        payload: errorMessage,
      });
      
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Register function
  const register = async (userData) => {
    try {
      dispatch({ type: AUTH_TYPES.AUTH_START });
      
      // Debug logging
      console.log('Registration request data:', userData);
      
      const response = await authAPI.register(userData);
      const { token, user } = response.data;
      
      // Store token in localStorage
      localStorage.setItem('token', token);
      
      dispatch({
        type: AUTH_TYPES.AUTH_SUCCESS,
        payload: { user, token },
      });
      
      toast.success(`Welcome to College Chatbot, ${user.name}!`);
      
      return { success: true, user };
    } catch (error) {
      // Enhanced error logging
      console.error('Registration error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });
      
      const errorMessage = error.response?.data?.message || 'Registration failed';
      
      dispatch({
        type: AUTH_TYPES.AUTH_FAIL,
        payload: errorMessage,
      });
      
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Logout function
  const logout = async () => {
    try {
      // Call logout API
      await authAPI.logout();
    } catch (error) {
      console.error('Logout API call failed:', error);
    } finally {
      // Clear local storage and state regardless of API call result
      localStorage.removeItem('token');
      dispatch({ type: AUTH_TYPES.LOGOUT });
      toast.success('Logged out successfully');
    }
  };

  // Update user profile
  const updateUser = (userData) => {
    dispatch({
      type: AUTH_TYPES.UPDATE_USER,
      payload: userData,
    });
  };

  // Clear error
  const clearError = () => {
    dispatch({ type: AUTH_TYPES.CLEAR_ERROR });
  };

  // Refresh token
  const refreshToken = async () => {
    try {
      const response = await authAPI.refreshToken();
      const { token } = response.data;
      
      localStorage.setItem('token', token);
      
      return token;
    } catch (error) {
      console.error('Token refresh failed:', error);
      logout();
      return null;
    }
  };

  // Change password
  const changePassword = async (currentPassword, newPassword) => {
    try {
      await authAPI.changePassword(currentPassword, newPassword);
      toast.success('Password changed successfully');
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Password change failed';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Helper function to check if user is admin
  const isAdmin = () => {
    return state.user?.role === 'admin';
  };

  // Helper function to check if user is authenticated
  const isAuthenticated = () => {
    return state.isAuthenticated && state.user && state.token;
  };

  // Context value
  const value = {
    ...state,
    login,
    register,
    logout,
    updateUser,
    clearError,
    refreshToken,
    changePassword,
    isAdmin,
    isAuthenticated: isAuthenticated,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};

export default AuthContext;