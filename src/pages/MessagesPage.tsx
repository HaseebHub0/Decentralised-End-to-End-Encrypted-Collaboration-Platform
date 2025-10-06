import React, { useEffect, useState } from 'react'
import { sendEncryptedMessage, fetchAndDecryptMessages } from '../utils/messages'
import { useAuth } from '../utils/auth'

export default function MessagesPage() {
  const { user } = useAuth()
  const [to, setTo] = useState('')
  const [text, setText] = useState('')
  const [inbox, setInbox] = useState<any[]>([])

  useEffect(() => {
    if (!user) return
    ;(async () => {
      const msgs = await fetchAndDecryptMessages(user.username)
      setInbox(msgs)
    })()
  }, [user])

  const send = async () => {
    if (!user) return
    await sendEncryptedMessage(user.username, to, text)
    setText('')
    const msgs = await fetchAndDecryptMessages(user.username)
    setInbox(msgs)
  }

  return (
    <div className="p-6">
      <h2 className="text-xl font-medium mb-4">Messages</h2>
      <div className="max-w-2xl">
        <div className="flex gap-2 mb-2">
          <input placeholder="to username" value={to} onChange={(e) => setTo(e.target.value)} className="flex-1 px-3 py-2 rounded bg-gray-800" />
          <button onClick={send} className="bg-primary px-3 py-2 rounded">Send</button>
        </div>
        <textarea placeholder="message" value={text} onChange={(e) => setText(e.target.value)} className="w-full h-24 p-3 rounded bg-gray-800 mb-4" />

        <div>
          <h3 className="font-medium mb-2">Inbox</h3>
          <div className="space-y-2">
            {inbox.map((m) => (
              <div key={m.ts} className="p-3 bg-gray-800 rounded">
                <div className="text-sm text-gray-400">From: {m.from}</div>
                <div className="mt-1">{m.plaintext}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
