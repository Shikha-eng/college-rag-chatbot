import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import Layout from '../../components/Layout';
import LoadingSpinner, { CardSkeleton, ButtonSpinner } from '../../components/LoadingSpinner';
import { adminAPI } from '../../services/api';
import { toast } from 'react-hot-toast';

const AdminUsers = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    role: '',
    isActive: true,
  });

  // Load users
  const loadUsers = async (page = 1, search = '') => {
    try {
      setIsLoading(true);
      const response = await adminAPI.getUsers(page, 10, search);
      
      setUsers(response.data.users || []);
      setTotalPages(Math.ceil((response.data.total || 0) / 10));
      setCurrentPage(page);
    } catch (error) {
      console.error('Failed to load users:', error);
      toast.error('Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

  // Load users on component mount
  useEffect(() => {
    loadUsers(1, searchTerm);
  }, []);

  // Handle search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      loadUsers(1, searchTerm);
    }, 500);
    
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Handle user selection
  const handleUserSelect = (user) => {
    setSelectedUser(user);
    setEditForm({
      name: user.name || '',
      email: user.email || '',
      phone: user.phone || '',
      role: user.role || 'student',
      isActive: user.isActive !== false,
    });
    setIsEditing(false);
  };

  // Handle user update
  const handleUserUpdate = async () => {
    if (!selectedUser) return;

    try {
      await adminAPI.updateUser(selectedUser._id, editForm);
      toast.success('User updated successfully');
      
      setIsEditing(false);
      loadUsers(currentPage, searchTerm);
      
      // Update selected user
      setSelectedUser({
        ...selectedUser,
        ...editForm,
      });
    } catch (error) {
      console.error('Failed to update user:', error);
      toast.error('Failed to update user');
    }
  };

  // Handle user deletion
  const handleUserDelete = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      await adminAPI.deleteUser(userId);
      toast.success('User deleted successfully');
      
      loadUsers(currentPage, searchTerm);
      
      // Clear selection if deleted user was selected
      if (selectedUser?._id === userId) {
        setSelectedUser(null);
      }
    } catch (error) {
      console.error('Failed to delete user:', error);
      toast.error('Failed to delete user');
    }
  };

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Get role badge color
  const getRoleBadge = (role) => {
    const colors = {
      admin: 'bg-red-100 text-red-800',
      student: 'bg-blue-100 text-blue-800',
      moderator: 'bg-purple-100 text-purple-800',
    };
    
    return colors[role] || 'bg-gray-100 text-gray-800';
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
            <p className="text-gray-600">Manage user accounts and permissions</p>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white rounded-lg shadow mb-6 p-6">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search users by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="text-sm text-gray-500">
              Total: {users.length} users
            </div>
          </div>
        </div>

        {/* Users List and Details */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Users List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">
                  Users ({users.length})
                </h3>
              </div>
              
              <div className="divide-y divide-gray-200">
                {isLoading ? (
                  <div className="p-6">
                    {[...Array(5)].map((_, i) => (
                      <CardSkeleton key={i} className="mb-4 last:mb-0" />
                    ))}
                  </div>
                ) : users.length === 0 ? (
                  <div className="p-12 text-center">
                    <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                    <p className="text-gray-500">No users found</p>
                  </div>
                ) : (
                  users.map((user) => (
                    <div
                      key={user._id}
                      className={`p-6 cursor-pointer hover:bg-gray-50 transition-colors ${
                        selectedUser?._id === user._id ? 'bg-blue-50 border-r-4 border-blue-500' : ''
                      }`}
                      onClick={() => handleUserSelect(user)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-3 mb-2">
                            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                              <span className="text-white text-sm font-medium">
                                {user.name?.charAt(0).toUpperCase() || 'U'}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {user.name}
                              </p>
                              <p className="text-sm text-gray-500 truncate">
                                {user.email}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-4 text-xs text-gray-500">
                            <span>Joined: {formatDate(user.createdAt)}</span>
                            {user.lastLogin && (
                              <span>Last login: {formatDate(user.lastLogin)}</span>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex flex-col items-end space-y-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getRoleBadge(user.role)}`}>
                            {user.role}
                          </span>
                          
                          <div className="flex items-center space-x-2">
                            <div className={`w-2 h-2 rounded-full ${user.isActive !== false ? 'bg-green-500' : 'bg-red-500'}`} />
                            <span className="text-xs text-gray-500">
                              {user.isActive !== false ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Quick Actions */}
                      {currentUser._id !== user._id && (
                        <div className="mt-4 pt-4 border-t border-gray-100 flex space-x-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUserSelect(user);
                              setIsEditing(true);
                            }}
                            className="text-blue-600 hover:text-blue-700 text-sm"
                          >
                            Edit
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUserDelete(user._id);
                            }}
                            className="text-red-600 hover:text-red-700 text-sm"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => loadUsers(Math.max(1, currentPage - 1), searchTerm)}
                      disabled={currentPage === 1}
                      className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <span className="text-sm text-gray-600">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => loadUsers(Math.min(totalPages, currentPage + 1), searchTerm)}
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

          {/* User Details/Edit Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow sticky top-8">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">
                  {selectedUser ? (isEditing ? 'Edit User' : 'User Details') : 'Select a User'}
                </h3>
              </div>
              
              {selectedUser ? (
                <div className="p-6">
                  {isEditing ? (
                    /* Edit Form */
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Name
                        </label>
                        <input
                          type="text"
                          value={editForm.name}
                          onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Email
                        </label>
                        <input
                          type="email"
                          value={editForm.email}
                          onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Phone
                        </label>
                        <input
                          type="text"
                          value={editForm.phone}
                          onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Role
                        </label>
                        <select
                          value={editForm.role}
                          onChange={(e) => setEditForm({...editForm, role: e.target.value})}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="student">Student</option>
                          <option value="admin">Admin</option>
                          <option value="moderator">Moderator</option>
                        </select>
                      </div>
                      
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={editForm.isActive}
                          onChange={(e) => setEditForm({...editForm, isActive: e.target.checked})}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label className="ml-2 block text-sm text-gray-900">
                          Account Active
                        </label>
                      </div>
                      
                      <div className="flex space-x-3 pt-4">
                        <button
                          onClick={handleUserUpdate}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors"
                        >
                          Save Changes
                        </button>
                        <button
                          onClick={() => setIsEditing(false)}
                          className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-md transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* User Details View */
                    <div className="space-y-6">
                      {/* Avatar and Basic Info */}
                      <div className="text-center">
                        <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full mx-auto flex items-center justify-center mb-4">
                          <span className="text-white text-2xl font-medium">
                            {selectedUser.name?.charAt(0).toUpperCase() || 'U'}
                          </span>
                        </div>
                        <h4 className="text-lg font-medium text-gray-900">{selectedUser.name}</h4>
                        <p className="text-gray-500">{selectedUser.email}</p>
                        <div className="mt-2">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getRoleBadge(selectedUser.role)}`}>
                            {selectedUser.role}
                          </span>
                        </div>
                      </div>

                      {/* Account Status */}
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h5 className="font-medium text-gray-900 mb-3">Account Status</h5>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-500">Status:</span>
                            <span className={`font-medium ${selectedUser.isActive !== false ? 'text-green-600' : 'text-red-600'}`}>
                              {selectedUser.isActive !== false ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Joined:</span>
                            <span className="text-gray-900">{formatDate(selectedUser.createdAt)}</span>
                          </div>
                          {selectedUser.lastLogin && (
                            <div className="flex justify-between">
                              <span className="text-gray-500">Last Login:</span>
                              <span className="text-gray-900">{formatDate(selectedUser.lastLogin)}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Contact Information */}
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h5 className="font-medium text-gray-900 mb-3">Contact Information</h5>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-500">Email:</span>
                            <span className="text-gray-900">{selectedUser.email}</span>
                          </div>
                          {selectedUser.phone && (
                            <div className="flex justify-between">
                              <span className="text-gray-500">Phone:</span>
                              <span className="text-gray-900">{selectedUser.phone}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      {currentUser._id !== selectedUser._id && (
                        <div className="flex space-x-3">
                          <button
                            onClick={() => setIsEditing(true)}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors"
                          >
                            Edit User
                          </button>
                          <button
                            onClick={() => handleUserDelete(selectedUser._id)}
                            className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md transition-colors"
                          >
                            Delete User
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-12 text-center">
                  <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                  <p className="text-gray-500 text-sm">
                    Select a user from the list to view details
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

export default AdminUsers;