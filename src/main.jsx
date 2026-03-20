import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Toaster } from 'react-hot-toast'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 3500,
        style: {
          background: '#1a2540',
          color: '#e2e8f0',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '10px',
          fontSize: '0.875rem',
          padding: '0.75rem 1rem',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        },
        success: {
          iconTheme: { primary: '#10b981', secondary: '#1a2540' },
        },
        error: {
          iconTheme: { primary: '#ef4444', secondary: '#1a2540' },
          duration: 4500,
        },
      }}
    />
    <App />
  </StrictMode>,
)
