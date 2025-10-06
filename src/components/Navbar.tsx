import React from 'react'
import { useAuth } from '../utils/auth'
import ThemeToggle from './ThemeToggle'

export default function Navbar() {
  const { logout } = useAuth()

  return (
    <nav className="bg-gray-800/50 backdrop-blur py-3">
      <div className="max-w-6xl mx-auto px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center font-medium">E</div>
          <div className="text-lg font-medium">E2EE Collab</div>
        </div>

        <div className="flex items-center gap-4">
          <ThemeToggle />
          <button onClick={logout} className="text-sm text-gray-300 bg-gray-700 px-3 py-1 rounded">Logout</button>
        </div>
      </div>
    </nav>
  )
}
