import React from 'react'
import { useParams } from 'react-router-dom'

export default function Placeholder() {
  const { name } = useParams()
  return (
    <div className="p-6">
      <h2 className="text-xl font-medium">{name}</h2>
      <p className="text-gray-400 mt-2">This is a placeholder page for {name}</p>
    </div>
  )
}
