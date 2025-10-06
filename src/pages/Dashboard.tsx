import React from 'react'
import { Link, Routes, Route } from 'react-router-dom'
import { useAuth } from '../utils/auth'
import Navbar from '../components/Navbar'

export default function Dashboard() {
  const { user } = useAuth()

  return (
    <div>
      <Navbar />
      <main className="p-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-medium mb-4">Welcome, {user?.username}</h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Link to="/dashboard/chat" className="p-6 bg-gray-800 rounded-lg shadow hover:scale-[1.02] transition">
              <h3 className="font-medium">E2EE Chat</h3>
              <p className="text-sm text-gray-400 mt-2">Real-time encrypted chat</p>
            </Link>
            <Link to="/dashboard/messages" className="p-6 bg-gray-800 rounded-lg shadow hover:scale-[1.02] transition">
              <h3 className="font-medium">Messages</h3>
              <p className="text-sm text-gray-400 mt-2">Encrypted messages</p>
            </Link>
            <Link to="/p/documents" className="p-6 bg-gray-800 rounded-lg shadow hover:scale-[1.02] transition">
              <h3 className="font-medium">Documents</h3>
              <p className="text-sm text-gray-400 mt-2">Collaborative docs</p>
            </Link>
          </div>
        </div>
      </main>

      <Routes>
        <Route path="/p/:name" element={<div />} />
      </Routes>
    </div>
  )
}
