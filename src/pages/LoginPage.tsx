import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../utils/auth'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const { login } = useAuth()
  const nav = useNavigate()

  const handle = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username) return
    const ok = await login(username)
    if (ok) nav('/dashboard')
    else alert('Login failed — maybe register first or ensure private key exists locally')
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-6">
      <form onSubmit={handle} className="w-full max-w-md bg-gray-800/60 backdrop-blur rounded-xl p-8 shadow-lg">
        <h1 className="text-2xl font-medium mb-4 text-white">Sign in</h1>
        <label className="block text-sm text-gray-300 mb-2">Username</label>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full px-4 py-2 rounded-md bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="yourname"
        />
        <button className="mt-4 w-full bg-primary text-white py-2 rounded-md font-medium">Login</button>
        <div className="mt-4 text-sm text-gray-300">
          No account? <Link to="/register" className="text-primary underline">Register</Link>
        </div>
      </form>
    </div>
  )
}
