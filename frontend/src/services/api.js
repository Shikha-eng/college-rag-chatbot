import axios from 'axios';
import { toast } from 'react-hot-toast';

// Base API configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    const { response } = error;
    
    if (response?.status === 401) {
      // Unauthorized - clear token and redirect to login
      localStorage.removeItem('token');
      window.location.href = '/login';
      toast.error('Session expired. Please login again.');
    } else if (response?.status === 403) {
      toast.error('Access denied. You do not have permission to perform this action.');
    } else if (response?.status === 429) {
      toast.error('Too many requests. Please slow down.');
    } else if (response?.status >= 500) {
      toast.error('Server error. Please try again later.');
    } else if (!response) {
      toast.error('Network error. Please check your connection.');
    }
    
    return Promise.reject(error);
  }
);

// Authentication API
export const authAPI = {
  // Register new user
  register: async (userData) => {
    const response = await api.post('/api/auth/register', userData);
    return response;
  },

  // Login user
  login: async (email, password) => {
    const response = await api.post('/api/auth/login', { email, password });
    return response;
  },

  // Logout user
  logout: async () => {
    const response = await api.post('/api/auth/logout');
    return response;
  },

  // Get user profile
  getProfile: async () => {
    const response = await api.get('/api/auth/me');
    return response;
  },

  // Update user profile
  updateProfile: async (userData) => {
    const response = await api.put('/api/auth/profile', userData);
    return response;
  },

  // Change password
  changePassword: async (currentPassword, newPassword) => {
    const response = await api.put('/api/auth/change-password', {
      currentPassword,
      newPassword,
    });
    return response;
  },

  // Refresh token
  refreshToken: async () => {
    const response = await api.post('/api/auth/refresh');
    return response;
  },

  // Request password reset
  forgotPassword: async (email) => {
    const response = await api.post('/api/auth/forgot-password', { email });
    return response;
  },

  // Reset password with token
  resetPassword: async (token, newPassword) => {
    const response = await api.post('/api/auth/reset-password', {
      token,
      newPassword,
    });
    return response;
  },
};

// Chat API
export const chatAPI = {
  // Send message to chatbot
  sendMessage: async (message, language = 'english', conversationId = null) => {
    const response = await api.post('/api/chat/message', {
      message,
      language,
      conversationId,
    });
    return response;
  },

  // Get chat history
  getHistory: async (page = 1, limit = 50) => {
    const response = await api.get('/api/chat/history', {
      params: { page, limit },
    });
    return response;
  },

  // Get specific conversation
  getConversation: async (conversationId) => {
    const response = await api.get(`/api/chat/conversation/${conversationId}`);
    return response;
  },

  // Delete conversation
  deleteConversation: async (conversationId) => {
    const response = await api.delete(`/api/chat/conversation/${conversationId}`);
    return response;
  },

  // Rate message
  rateMessage: async (messageId, rating) => {
    const response = await api.post(`/api/chat/rate/${messageId}`, { rating });
    return response;
  },

  // Escalate to admin
  escalateToAdmin: async (conversationId, reason) => {
    const response = await api.post('/api/chat/escalate', {
      conversationId,
      reason,
    });
    return response;
  },

  // Get chat statistics
  getStats: async () => {
    const response = await api.get('/api/chat/stats');
    return response;
  },
};

// Admin API
export const adminAPI = {
  // Get dashboard stats
  getDashboardStats: async () => {
    const response = await api.get('/api/admin/dashboard');
    return response;
  },

  // Get all users
  getUsers: async (page = 1, limit = 10, search = '') => {
    const response = await api.get('/api/admin/users', {
      params: { page, limit, search },
    });
    return response;
  },

  // Update user
  updateUser: async (userId, userData) => {
    const response = await api.put(`/api/admin/users/${userId}`, userData);
    return response;
  },

  // Delete user
  deleteUser: async (userId) => {
    const response = await api.delete(`/api/admin/users/${userId}`);
    return response;
  },

  // Get pending questions
  getPendingQuestions: async (page = 1, limit = 10) => {
    const response = await api.get('/api/admin/questions/pending', {
      params: { page, limit },
    });
    return response;
  },

  // Get all questions
  getAllQuestions: async (page = 1, limit = 10, status = '') => {
    const response = await api.get('/api/admin/questions', {
      params: { page, limit, status },
    });
    return response;
  },

  // Respond to question
  respondToQuestion: async (questionId, response) => {
    const responseData = await api.post(`/api/admin/questions/${questionId}/respond`, {
      response,
    });
    return responseData;
  },

  // Update question status
  updateQuestionStatus: async (questionId, status) => {
    const response = await api.put(`/api/admin/questions/${questionId}/status`, {
      status,
    });
    return response;
  },

  // Get analytics data
  getAnalytics: async (period = '7d') => {
    const response = await api.get('/api/admin/analytics', {
      params: { period },
    });
    return response;
  },

  // Export data
  exportData: async (type, format = 'csv') => {
    const response = await api.get(`/api/admin/export/${type}`, {
      params: { format },
      responseType: 'blob',
    });
    return response;
  },

  // Update system settings
  updateSettings: async (settings) => {
    const response = await api.put('/api/admin/settings', settings);
    return response;
  },

  // Get system settings
  getSettings: async () => {
    const response = await api.get('/api/admin/settings');
    return response;
  },

  // Trigger manual scraping
  triggerScraping: async (urls) => {
    const response = await api.post('/api/admin/scrape', { urls });
    return response;
  },

  // Get scraping status
  getScrapingStatus: async () => {
    const response = await api.get('/api/admin/scrape/status');
    return response;
  },
};

// Language API
export const languageAPI = {
  // Detect language
  detectLanguage: async (text) => {
    const response = await api.post('/api/language/detect', { text });
    return response;
  },

  // Translate text
  translateText: async (text, targetLanguage, sourceLanguage = null) => {
    const response = await api.post('/api/language/translate', {
      text,
      targetLanguage,
      sourceLanguage,
    });
    return response;
  },

  // Get supported languages
  getSupportedLanguages: async () => {
    const response = await api.get('/api/language/supported');
    return response;
  },
};

// WhatsApp API
export const whatsappAPI = {
  // Send WhatsApp message
  sendMessage: async (to, message, mediaUrl = null) => {
    const response = await api.post('/api/whatsapp/send', {
      to,
      message,
      mediaUrl,
    });
    return response;
  },

  // Get WhatsApp status
  getStatus: async () => {
    const response = await api.get('/api/whatsapp/status');
    return response;
  },

  // Get WhatsApp conversations
  getConversations: async (page = 1, limit = 10) => {
    const response = await api.get('/api/whatsapp/conversations', {
      params: { page, limit },
    });
    return response;
  },

  // Get WhatsApp conversation details
  getConversation: async (conversationId) => {
    const response = await api.get(`/api/whatsapp/conversations/${conversationId}`);
    return response;
  },
};

// File upload helper
export const uploadFile = async (file, endpoint = '/api/upload') => {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await api.post(endpoint, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (progressEvent) => {
      const percentCompleted = Math.round(
        (progressEvent.loaded * 100) / progressEvent.total
      );
      // You can use this to show upload progress
      console.log(`Upload Progress: ${percentCompleted}%`);
    },
  });
  
  return response;
};

// Download file helper
export const downloadFile = async (url, filename) => {
  try {
    const response = await api.get(url, {
      responseType: 'blob',
    });
    
    const blob = new Blob([response.data]);
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(downloadUrl);
  } catch (error) {
    console.error('Download failed:', error);
    toast.error('Download failed');
  }
};

// Health check
export const healthCheck = async () => {
  try {
    const response = await api.get('/health');
    return response.data;
  } catch (error) {
    console.error('Health check failed:', error);
    return { status: 'error' };
  }
};

export default api;