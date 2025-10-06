import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import Dashboard from './pages/Dashboard'
import MessagesPage from './pages/MessagesPage'
import ChatPage from './pages/ChatPage'
import Placeholder from './pages/Placeholder'
import { AuthProvider, useAuth } from './utils/auth'

const ProtectedRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-900 text-gray-100">
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/dashboard/*"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route path="/dashboard/messages" element={<ProtectedRoute><MessagesPage /></ProtectedRoute>} />
          <Route path="/dashboard/chat" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
          <Route path="/p/:name" element={<Placeholder />} />
        </Routes>
      </div>
    </AuthProvider>
  )
}

