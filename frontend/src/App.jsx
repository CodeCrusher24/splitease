// frontend/src/App.jsx
import { useEffect, useState } from 'react';
import apiClient from './api/client';

function App() {
  const [status, setStatus] = useState('Checking...');

  useEffect(() => {
    // Ping the backend health check
    fetch('http://127.0.0.1:8000/health')
      .then((res) => res.json())
      .then((data) => setStatus(data.status))
      .catch(() => setStatus('Offline'));
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md text-center max-w-md w-full">
        <h1 className="text-3xl font-bold text-indigo-600 mb-4">SplitEase</h1>
        <p className="text-gray-600 mb-6">Group Expense Manager</p>
        
        <div className="flex items-center justify-center gap-2">
          <span className="text-sm font-medium text-gray-500">Backend Status:</span>
          <span className={`px-2 py-1 rounded text-xs font-bold ${
            status === 'ok' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
            {status}
          </span>
        </div>
      </div>
    </div>
  );
}

export default App;