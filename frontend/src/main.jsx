import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app/App.jsx';
import { Providers } from './app/providers.jsx';
import { Toaster } from 'react-hot-toast';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Providers>
      <App />
      <Toaster
        position="top-center"
        reverseOrder={false}
        toastOptions={{
          success: {
            style: {
              background: '#22c55e', // Vibrant green
              color: '#ffffff',
              fontWeight: '600',
              padding: '16px 24px',
              borderRadius: '12px',
              boxShadow: '0 10px 25px -5px rgba(34, 197, 94, 0.4)',
            },
            iconTheme: {
              primary: '#ffffff',
              secondary: '#22c55e',
            },
          },
          error: {
            style: {
              background: '#ef4444',
              color: '#ffffff',
              fontWeight: '600',
              padding: '16px 24px',
              borderRadius: '12px',
              boxShadow: '0 10px 25px -5px rgba(239, 68, 68, 0.4)',
            },
            iconTheme: {
              primary: '#ffffff',
              secondary: '#ef4444',
            },
          }
        }}
      />
    </Providers>
  </React.StrictMode>,
)
