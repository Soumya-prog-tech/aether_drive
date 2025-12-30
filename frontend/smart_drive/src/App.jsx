// src/App.jsx
import React, { useContext } from 'react';
import { AuthContext } from './context/AuthContext'; // ✅ Import from dedicated file
import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';

function App() {
  // ✅ Consume the context provided by main.jsx
  const { isAuthenticated, isLoading } = useContext(AuthContext);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          <p className="text-gray-500 font-medium animate-pulse">Loading Secure Vault...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {isAuthenticated ? <DashboardPage /> : <AuthPage />}
    </div>
  );
}

export default App;