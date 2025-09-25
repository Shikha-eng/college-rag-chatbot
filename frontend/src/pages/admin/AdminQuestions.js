import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import Layout from '../../components/Layout';
import LoadingSpinner, { CardSkeleton, ButtonSpinner } from '../../components/LoadingSpinner';
import { adminAPI } from '../../services/api';
import { toast } from 'react-hot-toast';

const AdminQuestions = () => {
  const { user } = useAuth();
  const [questions, setQuestions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [responseText, setResponseText] = useState('');
  const [isResponding, setIsResponding] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Load questions
  const loadQuestions = async (page = 1, status = 'all', search = '') => {
    try {
      setIsLoading(true);
      const response = status === 'pending' 
        ? await adminAPI.getPendingQuestions(page, 10)
        : await adminAPI.getAllQuestions(page, 10, status === 'all' ? '' : status);
      
      setQuestions(response.data.questions || []);
      setTotalPages(Math.ceil((response.data.total || 0) / 10));
      setCurrentPage(page);
    } catch (error) {
      console.error('Failed to load questions:', error);
      toast.error('Failed to load questions');
    } finally {
      setIsLoading(false);
    }
  };

  // Load questions on component mount and when filters change
  useEffect(() => {
    loadQuestions(1, statusFilter, searchTerm);
  }, [statusFilter]);

  // Handle search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm || searchTerm === '') {
        loadQuestions(1, statusFilter, searchTerm);
      }
    }, 500);
    
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Respond to question
  const handleRespond = async () => {
    if (!selectedQuestion || !responseText.trim()) {
      toast.error('Please enter a response');
      return;
    }

    try {
      setIsResponding(true);
      await adminAPI.respondToQuestion(selectedQuestion._id, responseText.trim());
      
      toast.success('Response sent successfully');
      setSelectedQuestion(null);
      setResponseText('');
      
      // Reload questions
      loadQuestions(currentPage, statusFilter, searchTerm);
    } catch (error) {
      console.error('Failed to respond:', error);
      toast.error('Failed to send response');
    } finally {
      setIsResponding(false);
    }
  };

  // Update question status
  const updateQuestionStatus = async (questionId, newStatus) => {
    try {
      await adminAPI.updateQuestionStatus(questionId, newStatus);
      toast.success(`Question marked as ${newStatus}`);
      
      // Reload questions
      loadQuestions(currentPage, statusFilter, searchTerm);
    } catch (error) {
      console.error('Failed to update status:', error);
      toast.error('Failed to update question status');
    }
  };

  // Get status badge color
  const getStatusBadge = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      responded: 'bg-blue-100 text-blue-800',
      resolved: 'bg-green-100 text-green-800',
      escalated: 'bg-red-100 text-red-800',
    };
    
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Question Management</h1>
            <p className="text-gray-600">Manage and respond to user questions</p>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow mb-6 p-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Status Filter */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status Filter
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Questions</option>
                <option value="pending">Pending</option>
                <option value="responded">Responded</option>
                <option value="resolved">Resolved</option>
                <option value="escalated">Escalated</option>
              </select>
            </div>

            {/* Search */}
            <div className="flex-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Questions
              </label>
              <input
                type="text"
                placeholder="Search by question text or user name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Questions List */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Questions Panel */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">
                  Questions ({questions.length})
                </h3>
              </div>
              
              <div className="divide-y divide-gray-200">
                {isLoading ? (
                  <div className="p-6">
                    {[...Array(5)].map((_, i) => (
                      <CardSkeleton key={i} className="mb-4 last:mb-0" />
                    ))}
                  </div>
                ) : questions.length === 0 ? (
                  <div className="p-12 text-center">
                    <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-gray-500">No questions found</p>
                  </div>
                ) : (
                  questions.map((question) => (
                    <div
                      key={question._id}
                      className={`p-6 cursor-pointer hover:bg-gray-50 transition-colors ${
                        selectedQuestion?._id === question._id ? 'bg-blue-50 border-r-4 border-blue-500' : ''
                      }`}
                      onClick={() => setSelectedQuestion(question)}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {question.userDetails?.name || 'Anonymous User'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatDate(question.createdAt)}
                          </p>
                        </div>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusBadge(question.status)}`}>
                          {question.status}
                        </span>
                      </div>
                      
                      <div className="mb-3">
                        <p className="text-sm text-gray-800 line-clamp-3">
                          {question.question}
                        </p>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 text-xs text-gray-500">
                          <span>Language: {question.language || 'English'}</span>
                          {question.conversationId && (
                            <span>• Chat: {question.conversationId.slice(-8)}</span>
                          )}
                        </div>
                        
                        {question.status === 'pending' && (
                          <div className="flex space-x-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                updateQuestionStatus(question._id, 'resolved');
                              }}
                              className="text-green-600 hover:text-green-700 text-sm"
                            >
                              Resolve
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedQuestion(question);
                              }}
                              className="text-blue-600 hover:text-blue-700 text-sm"
                            >
                              Respond
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => loadQuestions(Math.max(1, currentPage - 1), statusFilter, searchTerm)}
                      disabled={currentPage === 1}
                      className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <span className="text-sm text-gray-600">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => loadQuestions(Math.min(totalPages, currentPage + 1), statusFilter, searchTerm)}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Response Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow sticky top-8">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">
                  {selectedQuestion ? 'Respond to Question' : 'Select a Question'}
                </h3>
              </div>
              
              {selectedQuestion ? (
                <div className="p-6">
                  {/* Question Details */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-gray-900">Question Details</h4>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusBadge(selectedQuestion.status)}`}>
                        {selectedQuestion.status}
                      </span>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-gray-500">From:</span>
                        <span className="ml-2 text-gray-900">
                          {selectedQuestion.userDetails?.name || 'Anonymous'}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Email:</span>
                        <span className="ml-2 text-gray-900">
                          {selectedQuestion.userDetails?.email || 'Not provided'}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Date:</span>
                        <span className="ml-2 text-gray-900">
                          {formatDate(selectedQuestion.createdAt)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Language:</span>
                        <span className="ml-2 text-gray-900">
                          {selectedQuestion.language || 'English'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Question Text */}
                  <div className="mb-6">
                    <h4 className="font-medium text-gray-900 mb-2">Question:</h4>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-800 whitespace-pre-wrap">
                        {selectedQuestion.question}
                      </p>
                    </div>
                  </div>

                  {/* Previous Response (if any) */}
                  {selectedQuestion.response && (
                    <div className="mb-6">
                      <h4 className="font-medium text-gray-900 mb-2">Previous Response:</h4>
                      <div className="bg-blue-50 rounded-lg p-4">
                        <p className="text-sm text-blue-800 whitespace-pre-wrap">
                          {selectedQuestion.response}
                        </p>
                        <div className="mt-2 text-xs text-blue-600">
                          Responded by: {selectedQuestion.respondedBy?.name || 'Admin'}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Response Form */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Your Response:
                      </label>
                      <textarea
                        value={responseText}
                        onChange={(e) => setResponseText(e.target.value)}
                        rows={6}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        placeholder="Type your response here..."
                      />
                    </div>
                    
                    <div className="flex space-x-3">
                      <button
                        onClick={handleRespond}
                        disabled={isResponding || !responseText.trim()}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-4 py-2 rounded-md transition-colors flex items-center justify-center space-x-2"
                      >
                        {isResponding ? (
                          <>
                            <ButtonSpinner size="sm" />
                            <span>Sending...</span>
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                            </svg>
                            <span>Send Response</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Quick Actions */}
                    <div className="pt-4 border-t border-gray-200">
                      <h4 className="text-sm font-medium text-gray-700 mb-3">Quick Actions:</h4>
                      <div className="space-y-2">
                        <button
                          onClick={() => updateQuestionStatus(selectedQuestion._id, 'resolved')}
                          className="w-full text-left px-3 py-2 text-sm text-green-700 hover:bg-green-50 rounded-md"
                        >
                          Mark as Resolved
                        </button>
                        <button
                          onClick={() => updateQuestionStatus(selectedQuestion._id, 'escalated')}
                          className="w-full text-left px-3 py-2 text-sm text-red-700 hover:bg-red-50 rounded-md"
                        >
                          Escalate Question
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-12 text-center">
                  <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a8.959 8.959 0 01-4.906-1.471L3 21l2.471-5.094A8.959 8.959 0 013 12c0-4.418 3.582-8 8-8s8 3.582 8 8z" />
                  </svg>
                  <p className="text-gray-500 text-sm">
                    Select a question from the list to view details and respond
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default AdminQuestions;