import React, { useState } from "react";
import ReactDOM from "react-dom/client";

// Simple dialog styles (since we don't have shadcn/ui components)
const dialogStyles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  },
  content: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '24px',
    minWidth: '400px',
    maxWidth: '500px',
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)'
  },
  header: {
    fontSize: '18px',
    fontWeight: 'bold',
    marginBottom: '16px',
    color: '#1f2937'
  },
  message: {
    fontSize: '14px',
    color: '#6b7280',
    marginBottom: '24px',
    lineHeight: '1.5'
  },
  footer: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end'
  },
  button: {
    padding: '8px 16px',
    borderRadius: '6px',
    border: 'none',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  cancelButton: {
    backgroundColor: '#f3f4f6',
    color: '#374151',
    border: '1px solid #d1d5db'
  },
  confirmButton: {
    backgroundColor: '#3b82f6',
    color: 'white'
  }
};

export function confirmDialog(message) {
  const el = document.createElement("div");
  document.body.appendChild(el);

  return new Promise(resolve => {
    function Confirm() {
      const [open, setOpen] = useState(true);
      
      const close = (value) => {
        setOpen(false);
        resolve(value);
        setTimeout(() => {
          if (el && el.parentNode) {
            el.parentNode.removeChild(el);
          }
        }, 100);
      };

      if (!open) return null;

      return (
        <div style={dialogStyles.overlay} onClick={() => close(false)}>
          <div style={dialogStyles.content} onClick={(e) => e.stopPropagation()}>
            <div style={dialogStyles.header}>Confirm Action</div>
            <div style={dialogStyles.message}>{message}</div>
            <div style={dialogStyles.footer}>
              <button 
                style={{...dialogStyles.button, ...dialogStyles.cancelButton}}
                onClick={() => close(false)}
                onMouseOver={(e) => e.target.style.backgroundColor = '#e5e7eb'}
                onMouseOut={(e) => e.target.style.backgroundColor = '#f3f4f6'}
              >
                Cancel
              </button>
              <button 
                style={{...dialogStyles.button, ...dialogStyles.confirmButton}}
                onClick={() => close(true)}
                onMouseOver={(e) => e.target.style.backgroundColor = '#2563eb'}
                onMouseOut={(e) => e.target.style.backgroundColor = '#3b82f6'}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Create React root and render the component
    const root = ReactDOM.createRoot(el);
    root.render(<Confirm />);
  });
}
