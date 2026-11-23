import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { Toaster } from 'react-hot-toast'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Toaster 
      position="bottom-right"
      toastOptions={{
        style: {
          background: '#333',
          color: '#fff',
          borderRadius: '10px',
          fontSize: '14px',
          fontWeight: '500',
        },
      }}
    />
    <App />
  </React.StrictMode>,
)