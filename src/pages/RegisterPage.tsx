import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../utils/auth'

export default function RegisterPage() {
  const [username, setUsername] = useState('')
  const [toast, setToast] = useState('')
  const auth = useAuth()
  const nav = useNavigate()

  const doRegister = async () => {
    if (!username) return
    await auth.register(username)
    setToast('Registration successful')
    setTimeout(() => {
      setToast('')
      nav('/dashboard')
    }, 900)
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-6">
      <div className="w-full max-w-md bg-gray-800/60 backdrop-blur rounded-xl p-8 shadow-lg">
        <h1 className="text-2xl font-medium mb-4">Register</h1>
        <label className="block text-sm text-gray-300 mb-2">Username</label>
        <input value={username} onChange={(e) => setUsername(e.target.value)} className="w-full px-4 py-2 rounded-md bg-gray-700 text-white mb-3" />

        <div className="flex gap-2">
          <button onClick={doRegister} className="flex-1 bg-primary text-white py-2 rounded-md">Generate Keypair & Register</button>
        </div>

        {toast && <div className="mt-4 p-2 bg-green-600 rounded text-sm">{toast}</div>}
      </div>
    </div>
  )
}
