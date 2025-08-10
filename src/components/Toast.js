import React, { useState, useEffect, createContext, useContext } from 'react';

// Toast Context
const ToastContext = createContext();

// Toast Provider Component
export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = 'info', duration = 5000) => {
    const id = Date.now() + Math.random();
    const toast = { id, message, type, duration };
    
    setToasts(prev => [...prev, toast]);
    
    // Auto remove toast after duration
    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
    
    return id;
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const clearAllToasts = () => {
    setToasts([]);
  };

  return (
    <ToastContext.Provider value={{ addToast, removeToast, clearAllToasts }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
};

// Hook to use toast
export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

// Toast Container Component
const ToastContainer = ({ toasts, onRemove }) => {
  if (toasts.length === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: '10px'
    }}>
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          toast={toast}
          onRemove={() => onRemove(toast.id)}
        />
      ))}
    </div>
  );
};

// Individual Toast Component
const Toast = ({ toast, onRemove }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger animation
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  const handleRemove = () => {
    setIsVisible(false);
    setTimeout(onRemove, 300); // Wait for animation
  };

  const getToastStyles = (type) => {
    const baseStyles = {
      padding: '12px 16px',
      borderRadius: '8px',
      color: 'white',
      fontWeight: '500',
      fontSize: '14px',
      maxWidth: '400px',
      wordWrap: 'break-word',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      transform: isVisible ? 'translateX(0)' : 'translateX(100%)',
      opacity: isVisible ? 1 : 0,
      transition: 'all 0.3s ease-in-out',
      cursor: 'pointer'
    };

    const typeStyles = {
      success: { backgroundColor: '#00b894' },
      error: { backgroundColor: '#e17055' },
      warning: { backgroundColor: '#fdcb6e' },
      info: { backgroundColor: '#0984e3' }
    };

    return { ...baseStyles, ...typeStyles[type] };
  };

  const getIcon = (type) => {
    const icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️'
    };
    return icons[type] || icons.info;
  };

  return (
    <div
      style={getToastStyles(toast.type)}
      onClick={handleRemove}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span>{getIcon(toast.type)}</span>
        <span>{toast.message}</span>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleRemove();
        }}
        style={{
          background: 'none',
          border: 'none',
          color: 'white',
          fontSize: '18px',
          cursor: 'pointer',
          padding: '0',
          marginLeft: '8px'
        }}
      >
        ×
      </button>
    </div>
  );
};

// Utility functions for common toast types
export const showSuccessToast = (addToast, message) => {
  return addToast(message, 'success');
};

export const showErrorToast = (addToast, message) => {
  return addToast(message, 'error', 8000); // Longer duration for errors
};

export const showWarningToast = (addToast, message) => {
  return addToast(message, 'warning', 6000);
};

export const showInfoToast = (addToast, message) => {
  return addToast(message, 'info');
};

export default Toast;
