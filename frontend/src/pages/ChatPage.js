import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { chatAPI } from '../services/api';
import Layout from '../components/Layout';
import LoadingSpinner, { ButtonSpinner } from '../components/LoadingSpinner';
import { toast } from 'react-hot-toast';

const ChatPage = () => {
  const { user } = useAuth();
  const { currentLanguage, translateText, detectLanguage, getCurrentLanguageInfo } = useLanguage();
  
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // Load chat history on component mount
  useEffect(() => {
    loadChatHistory();
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [inputMessage]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadChatHistory = async () => {
    try {
      setIsLoadingHistory(true);
      const response = await chatAPI.getHistory(1, 10);
      setChatHistory(response.data.conversations || []);
    } catch (error) {
      console.error('Failed to load chat history:', error);
      toast.error('Failed to load chat history');
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const loadConversation = async (convId) => {
    try {
      setIsLoading(true);
      const response = await chatAPI.getConversation(convId);
      const conversation = response.data.conversation;
      
      setConversationId(convId);
      setMessages(conversation.messages || []);
      
      toast.success('Conversation loaded');
    } catch (error) {
      console.error('Failed to load conversation:', error);
      toast.error('Failed to load conversation');
    } finally {
      setIsLoading(false);
    }
  };

  const startNewChat = () => {
    setMessages([]);
    setConversationId(null);
    setInputMessage('');
    
    // Add welcome message
    const welcomeMessage = {
      id: 'welcome-' + Date.now(),
      type: 'bot',
      content: `Hello ${user?.name || 'there'}! I'm your college assistant. I can help you with information about courses, admissions, facilities, and more. How can I help you today?`,
      timestamp: new Date().toISOString(),
      language: currentLanguage,
    };
    
    setMessages([welcomeMessage]);
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = {
      id: 'user-' + Date.now(),
      type: 'user',
      content: inputMessage.trim(),
      timestamp: new Date().toISOString(),
      language: currentLanguage,
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    setIsTyping(true);

    try {
      const response = await chatAPI.sendMessage(
        userMessage.content,
        currentLanguage,
        conversationId
      );

      const botMessage = {
        id: 'bot-' + Date.now(),
        type: 'bot',
        content: response.data.response,
        timestamp: new Date().toISOString(),
        language: currentLanguage,
        confidence: response.data.confidence,
        sources: response.data.sources || [],
      };

      setMessages(prev => [...prev, botMessage]);
      
      // Update conversation ID if this is a new conversation
      if (response.data.conversationId && !conversationId) {
        setConversationId(response.data.conversationId);
        loadChatHistory(); // Refresh history to include new conversation
      }
      
    } catch (error) {
      console.error('Failed to send message:', error);
      
      const errorMessage = {
        id: 'error-' + Date.now(),
        type: 'bot',
        content: 'Sorry, I encountered an error while processing your message. Please try again.',
        timestamp: new Date().toISOString(),
        language: currentLanguage,
        isError: true,
      };
      
      setMessages(prev => [...prev, errorMessage]);
      toast.error('Failed to send message');
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const escalateToAdmin = async () => {
    if (!conversationId) {
      toast.error('Please start a conversation first');
      return;
    }

    try {
      await chatAPI.escalateToAdmin(conversationId, 'User requested human assistance');
      toast.success('Your question has been escalated to our admin team. You will receive a response soon.');
      
      const escalationMessage = {
        id: 'escalation-' + Date.now(),
        type: 'system',
        content: 'Your question has been forwarded to our admin team for human assistance. You will receive a response within 24 hours.',
        timestamp: new Date().toISOString(),
        language: currentLanguage,
      };
      
      setMessages(prev => [...prev, escalationMessage]);
    } catch (error) {
      console.error('Failed to escalate:', error);
      toast.error('Failed to escalate to admin');
    }
  };

  const rateMessage = async (messageId, rating) => {
    try {
      await chatAPI.rateMessage(messageId, rating);
      toast.success('Thank you for your feedback!');
    } catch (error) {
      console.error('Failed to rate message:', error);
      toast.error('Failed to submit rating');
    }
  };

  // Start new chat on component mount
  useEffect(() => {
    if (messages.length === 0) {
      startNewChat();
    }
  }, []);

  return (
    <Layout>
      <div className="flex h-[calc(100vh-4rem)] bg-gray-50">
        {/* Sidebar - Chat History */}
        <div className="w-1/4 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <button
              onClick={startNewChat}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              <span>New Chat</span>
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Recent Chats</h3>
            
            {isLoadingHistory ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
                ))}
              </div>
            ) : chatHistory.length === 0 ? (
              <div className="text-center py-8">
                <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a8.959 8.959 0 01-4.906-1.471L3 21l2.471-5.094A8.959 8.959 0 013 12c0-4.418 3.582-8 8-8s8 3.582 8 8z" />
                </svg>
                <p className="text-gray-500 text-sm">No previous chats</p>
              </div>
            ) : (
              <div className="space-y-2">
                {chatHistory.map((conversation) => (
                  <button
                    key={conversation._id}
                    onClick={() => loadConversation(conversation._id)}
                    className={`w-full text-left p-3 rounded-lg hover:bg-gray-50 transition-colors ${
                      conversationId === conversation._id ? 'bg-blue-50 border border-blue-200' : 'border border-transparent'
                    }`}
                  >
                    <div className="font-medium text-sm text-gray-900 truncate">
                      {conversation.title || 'Untitled Chat'}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {new Date(conversation.updatedAt).toLocaleDateString()}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Chat Header */}
          <div className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  College Assistant
                </h2>
                <p className="text-sm text-gray-500">
                  {getCurrentLanguageInfo()?.nativeName} • Online
                </p>
              </div>
              
              <div className="flex items-center space-x-3">
                <button
                  onClick={escalateToAdmin}
                  disabled={!conversationId}
                  className="text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Escalate to Admin"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M12 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((message, index) => (
              <div
                key={message.id}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-2xl px-4 py-3 rounded-lg ${
                    message.type === 'user'
                      ? 'bg-blue-600 text-white'
                      : message.type === 'system'
                      ? 'bg-yellow-50 text-yellow-800 border border-yellow-200'
                      : message.isError
                      ? 'bg-red-50 text-red-800 border border-red-200'
                      : 'bg-white text-gray-900 border border-gray-200'
                  }`}
                >
                  {/* Message Content */}
                  <div className="text-sm whitespace-pre-wrap">
                    {message.content}
                  </div>
                  
                  {/* Message Sources (for bot responses) */}
                  {message.sources && message.sources.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-100">
                      <div className="text-xs text-gray-500">Sources:</div>
                      <div className="space-y-1">
                        {message.sources.slice(0, 2).map((source, idx) => (
                          <div key={idx} className="text-xs text-blue-600 hover:text-blue-800">
                            {source.title}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Message Timestamp */}
                  <div className={`text-xs mt-2 ${
                    message.type === 'user' ? 'text-blue-200' : 'text-gray-400'
                  }`}>
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </div>
                  
                  {/* Rating Buttons (for bot messages) */}
                  {message.type === 'bot' && !message.isError && (
                    <div className="mt-2 pt-2 border-t border-gray-100 flex items-center space-x-2">
                      <span className="text-xs text-gray-500">Rate this response:</span>
                      <button
                        onClick={() => rateMessage(message.id, 'helpful')}
                        className="text-green-500 hover:text-green-600 text-xs"
                        title="Helpful"
                      >
                        👍
                      </button>
                      <button
                        onClick={() => rateMessage(message.id, 'not_helpful')}
                        className="text-red-500 hover:text-red-600 text-xs"
                        title="Not Helpful"
                      >
                        👎
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <div className="bg-white border-t border-gray-200 p-4">
            <div className="flex items-end space-x-3">
              <div className="flex-1 relative">
                <textarea
                  ref={textareaRef}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={`Type your message in ${getCurrentLanguageInfo()?.name || 'English'}...`}
                  className="w-full resize-none border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 max-h-32"
                  rows="1"
                  disabled={isLoading}
                />
              </div>
              
              <button
                onClick={sendMessage}
                disabled={!inputMessage.trim() || isLoading}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg transition-colors flex items-center space-x-2"
              >
                {isLoading ? (
                  <ButtonSpinner size="sm" />
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                )}
                <span>Send</span>
              </button>
            </div>
            
            <div className="mt-2 text-xs text-gray-500 text-center">
              Press Enter to send, Shift + Enter for new line
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ChatPage;