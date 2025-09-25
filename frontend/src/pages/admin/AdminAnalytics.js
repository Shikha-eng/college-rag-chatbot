import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import Layout from '../../components/Layout';
import LoadingSpinner, { CardSkeleton } from '../../components/LoadingSpinner';
import { adminAPI } from '../../services/api';
import { toast } from 'react-hot-toast';

const AdminAnalytics = () => {
  const { user } = useAuth();
  const [analyticsData, setAnalyticsData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('7d');
  const [refreshing, setRefreshing] = useState(false);

  // Load analytics data
  const loadAnalyticsData = async (period = '7d') => {
    try {
      setIsLoading(true);
      const response = await adminAPI.getAnalytics(period);
      setAnalyticsData(response.data);
    } catch (error) {
      console.error('Failed to load analytics data:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setIsLoading(false);
    }
  };

  // Refresh analytics data
  const refreshAnalytics = async () => {
    try {
      setRefreshing(true);
      await loadAnalyticsData(selectedPeriod);
      toast.success('Analytics refreshed');
    } catch (error) {
      console.error('Failed to refresh analytics:', error);
      toast.error('Failed to refresh analytics');
    } finally {
      setRefreshing(false);
    }
  };

  // Load data on component mount and when period changes
  useEffect(() => {
    loadAnalyticsData(selectedPeriod);
  }, [selectedPeriod]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      loadAnalyticsData(selectedPeriod);
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [selectedPeriod]);

  // Format number with commas
  const formatNumber = (num) => {
    return new Intl.NumberFormat().format(num || 0);
  };

  // Format percentage
  const formatPercentage = (num) => {
    return `${(num || 0).toFixed(1)}%`;
  };

  // Get period label
  const getPeriodLabel = (period) => {
    const labels = {
      '24h': 'Last 24 Hours',
      '7d': 'Last 7 Days',
      '30d': 'Last 30 Days',
      '90d': 'Last 90 Days',
    };
    return labels[period] || 'Last 7 Days';
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-2 animate-pulse" />
            <div className="h-4 bg-gray-200 rounded w-1/3 animate-pulse" />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <CardSkeleton key={i} className="h-32" />
            ))}
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <CardSkeleton className="h-96" />
            <CardSkeleton className="h-96" />
          </div>
        </div>
      </Layout>
    );
  }

  const data = analyticsData || {};

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
            <p className="text-gray-600">System performance and usage metrics</p>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Period Selector */}
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
            </select>
            
            <button
              onClick={refreshAnalytics}
              disabled={refreshing}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <svg className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Messages */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a8.959 8.959 0 01-4.906-1.471L3 21l2.471-5.094A8.959 8.959 0 013 12c0-4.418 3.582-8 8-8s8 3.582 8 8z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Messages</dt>
                    <dd className="text-lg font-medium text-gray-900">{formatNumber(data.totalMessages)}</dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-5 py-3">
              <div className="text-sm">
                <span className={`font-medium ${data.messageGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {data.messageGrowth >= 0 ? '+' : ''}{formatPercentage(data.messageGrowth)}
                </span>
                <span className="text-gray-600"> vs previous period</span>
              </div>
            </div>
          </div>

          {/* Active Users */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Active Users</dt>
                    <dd className="text-lg font-medium text-gray-900">{formatNumber(data.activeUsers)}</dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-5 py-3">
              <div className="text-sm">
                <span className={`font-medium ${data.userGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {data.userGrowth >= 0 ? '+' : ''}{formatPercentage(data.userGrowth)}
                </span>
                <span className="text-gray-600"> vs previous period</span>
              </div>
            </div>
          </div>

          {/* Avg Response Time */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Avg Response Time</dt>
                    <dd className="text-lg font-medium text-gray-900">{data.avgResponseTime || 0}ms</dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-5 py-3">
              <div className="text-sm">
                <span className={`font-medium ${data.responseTimeChange <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {data.responseTimeChange <= 0 ? '' : '+'}{data.responseTimeChange || 0}ms
                </span>
                <span className="text-gray-600"> vs previous period</span>
              </div>
            </div>
          </div>

          {/* Satisfaction Rate */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Satisfaction Rate</dt>
                    <dd className="text-lg font-medium text-gray-900">{formatPercentage(data.satisfactionRate)}</dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-5 py-3">
              <div className="text-sm">
                <span className={`font-medium ${data.satisfactionChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {data.satisfactionChange >= 0 ? '+' : ''}{formatPercentage(data.satisfactionChange)}
                </span>
                <span className="text-gray-600"> vs previous period</span>
              </div>
            </div>
          </div>
        </div>

        {/* Charts and Detailed Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Language Usage */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Language Usage</h3>
              <p className="text-sm text-gray-500">{getPeriodLabel(selectedPeriod)}</p>
            </div>
            <div className="p-6">
              {data.languageStats && data.languageStats.length > 0 ? (
                <div className="space-y-4">
                  {data.languageStats.map((lang, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                        <span className="text-sm font-medium text-gray-900 capitalize">
                          {lang.language}
                        </span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${lang.percentage}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-600 w-12">
                          {formatPercentage(lang.percentage)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">No language data available</p>
                </div>
              )}
            </div>
          </div>

          {/* Popular Topics */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Popular Topics</h3>
              <p className="text-sm text-gray-500">{getPeriodLabel(selectedPeriod)}</p>
            </div>
            <div className="p-6">
              {data.topicStats && data.topicStats.length > 0 ? (
                <div className="space-y-4">
                  {data.topicStats.map((topic, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {topic.topic}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatNumber(topic.count)} questions
                        </p>
                      </div>
                      <div className="ml-4 flex-shrink-0">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {formatPercentage(topic.percentage)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">No topic data available</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* System Performance */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">System Performance</h3>
            <p className="text-sm text-gray-500">{getPeriodLabel(selectedPeriod)}</p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* API Performance */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">API Performance</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Avg Response Time:</span>
                    <span className="font-medium">{data.apiResponseTime || 0}ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Success Rate:</span>
                    <span className="font-medium text-green-600">
                      {formatPercentage(data.apiSuccessRate || 100)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Error Rate:</span>
                    <span className="font-medium text-red-600">
                      {formatPercentage(data.apiErrorRate || 0)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Database Performance */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">Database Performance</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Query Time:</span>
                    <span className="font-medium">{data.dbQueryTime || 0}ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Connection Pool:</span>
                    <span className="font-medium text-blue-600">
                      {data.dbConnections || 0}/100
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Storage Used:</span>
                    <span className="font-medium">
                      {data.storageUsed || '0'} MB
                    </span>
                  </div>
                </div>
              </div>

              {/* AI Model Performance */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">AI Model Performance</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Model Response:</span>
                    <span className="font-medium">{data.modelResponseTime || 0}ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Accuracy Rate:</span>
                    <span className="font-medium text-green-600">
                      {formatPercentage(data.modelAccuracy || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Confidence:</span>
                    <span className="font-medium">
                      {formatPercentage(data.avgConfidence || 0)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default AdminAnalytics;