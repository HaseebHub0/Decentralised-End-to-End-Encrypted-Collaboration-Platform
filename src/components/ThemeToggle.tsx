import React, { useEffect, useState } from 'react'

export default function ThemeToggle() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'))

  useEffect(() => {
    if (dark) document.documentElement.classList.add('dark')
    else document.documentElement.classList.remove('dark')
  }, [dark])

  return (
    <button onClick={() => setDark((d) => !d)} className="px-2 py-1 bg-gray-700 text-sm rounded text-gray-200">
      {dark ? 'Light' : 'Dark'}
    </button>
  )
}
