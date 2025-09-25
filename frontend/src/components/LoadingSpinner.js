import React from 'react';

const LoadingSpinner = ({ 
  size = 'md', 
  color = 'blue', 
  text = '', 
  overlay = false,
  fullScreen = false 
}) => {
  // Size classes
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  // Color classes
  const colorClasses = {
    blue: 'text-blue-600',
    green: 'text-green-600',
    purple: 'text-purple-600',
    indigo: 'text-indigo-600',
    pink: 'text-pink-600',
    gray: 'text-gray-600',
    white: 'text-white',
  };

  // Container classes based on props
  const containerClasses = [
    'flex items-center justify-center',
    fullScreen && 'min-h-screen',
    overlay && 'absolute inset-0 bg-white bg-opacity-75 z-50',
  ].filter(Boolean).join(' ');

  return (
    <div className={containerClasses}>
      <div className="flex flex-col items-center space-y-2">
        {/* Spinner */}
        <div className="relative">
          <div
            className={`
              ${sizeClasses[size]} 
              ${colorClasses[color]} 
              animate-spin
            `}
          >
            <svg
              className="w-full h-full"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </div>
          
          {/* Pulsing ring effect */}
          <div
            className={`
              absolute inset-0 
              ${sizeClasses[size]} 
              ${colorClasses[color]} 
              opacity-20 
              animate-ping 
              rounded-full
            `}
          />
        </div>

        {/* Loading text */}
        {text && (
          <div className="text-center">
            <p className={`text-sm font-medium ${colorClasses[color]}`}>
              {text}
            </p>
            
            {/* Animated dots */}
            <div className="flex justify-center space-x-1 mt-1">
              <div className={`w-1 h-1 ${colorClasses[color]} bg-current rounded-full animate-bounce`} style={{ animationDelay: '0ms' }} />
              <div className={`w-1 h-1 ${colorClasses[color]} bg-current rounded-full animate-bounce`} style={{ animationDelay: '150ms' }} />
              <div className={`w-1 h-1 ${colorClasses[color]} bg-current rounded-full animate-bounce`} style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Skeleton loader component for content loading states
export const SkeletonLoader = ({ 
  lines = 3, 
  width = 'full', 
  height = '4',
  className = '',
  animated = true 
}) => {
  const widthClasses = {
    'full': 'w-full',
    '3/4': 'w-3/4',
    '1/2': 'w-1/2',
    '1/4': 'w-1/4',
  };

  const heightClasses = {
    '2': 'h-2',
    '3': 'h-3',
    '4': 'h-4',
    '6': 'h-6',
    '8': 'h-8',
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          className={`
            ${heightClasses[height]}
            ${index === lines - 1 ? widthClasses['3/4'] : widthClasses[width]}
            bg-gray-200
            rounded
            ${animated ? 'animate-pulse' : ''}
          `}
        />
      ))}
    </div>
  );
};

// Card skeleton for loading cards
export const CardSkeleton = ({ className = '' }) => {
  return (
    <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
      <div className="animate-pulse">
        {/* Header */}
        <div className="flex items-center space-x-4 mb-4">
          <div className="w-10 h-10 bg-gray-200 rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 rounded w-1/4" />
            <div className="h-3 bg-gray-200 rounded w-1/3" />
          </div>
        </div>
        
        {/* Content */}
        <div className="space-y-3">
          <div className="h-4 bg-gray-200 rounded" />
          <div className="h-4 bg-gray-200 rounded w-3/4" />
          <div className="h-4 bg-gray-200 rounded w-1/2" />
        </div>
        
        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-gray-100">
          <div className="flex justify-between items-center">
            <div className="h-3 bg-gray-200 rounded w-1/4" />
            <div className="h-8 bg-gray-200 rounded w-20" />
          </div>
        </div>
      </div>
    </div>
  );
};

// Button loading state
export const ButtonSpinner = ({ size = 'sm', className = '' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  return (
    <div className={`inline-flex items-center ${className}`}>
      <svg
        className={`animate-spin ${sizeClasses[size]} text-current`}
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    </div>
  );
};

// Loading overlay for forms or pages
export const LoadingOverlay = ({ 
  visible = false, 
  text = 'Loading...', 
  blur = true 
}) => {
  if (!visible) return null;

  return (
    <div className={`
      absolute inset-0 z-50 flex items-center justify-center
      ${blur ? 'backdrop-blur-sm' : ''}
      bg-white bg-opacity-75
    `}>
      <LoadingSpinner size="lg" text={text} color="blue" />
    </div>
  );
};

export default LoadingSpinner;