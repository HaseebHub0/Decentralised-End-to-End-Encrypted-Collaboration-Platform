import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../utils/auth';
import {
  ChatSessionManager,
  generateChatKeyPair,
  exportChatPublicKey,
  importChatPublicKey,
  deriveSharedKey,
  encryptChatMessage,
  decryptChatMessage,
} from '../utils/chat';

interface Message {
  from: string;
  to: string;
  content: string;
  timestamp: number;
}

export default function ChatPage() {
  const { user } = useAuth();
  const username = user?.username || '';
  const [messages, setMessages] = useState<Message[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');

  const wsRef = useRef<WebSocket | null>(null);
  const keyPairRef = useRef<CryptoKeyPair | null>(null);
  const sessionManagerRef = useRef<ChatSessionManager>(new ChatSessionManager());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // WebSocket + Key Handling
  useEffect(() => {
    if (!username) return;

    async function connect() {
      keyPairRef.current = await generateChatKeyPair();
      const ws = new WebSocket('ws://localhost:3001');
      wsRef.current = ws;

      ws.onopen = async () => {
        setStatus('connected');
        ws.send(JSON.stringify({ type: 'register', username }));
      };

      ws.onclose = () => {
        setStatus('disconnected');
        setTimeout(connect, 5000);
      };

      ws.onmessage = async (event) => {
        const data = JSON.parse(event.data);

        switch (data.type) {
          case 'status':
            setOnlineUsers(data.users.filter((u: string) => u !== username));
            break;

          case 'keyexchange':
            try {
              const theirPubKey = await importChatPublicKey(data.publicKey);
              const sharedKey = await deriveSharedKey(
                keyPairRef.current!.privateKey,
                theirPubKey
              );
              await sessionManagerRef.current.setSession(data.from, sharedKey);

              if (!sessionManagerRef.current.getSession(data.from)) {
                const ourPubKeyB64 = await exportChatPublicKey(
                  keyPairRef.current!.publicKey
                );
                ws.send(JSON.stringify({
                  type: 'keyexchange',
                  to: data.from,
                  publicKey: ourPubKeyB64,
                }));
              }
            } catch (err) {
              console.error('Key exchange failed:', err);
            }
            break;

          case 'chat':
            try {
              const sharedKey = sessionManagerRef.current.getSession(data.from);
              if (!sharedKey) return;

              const decrypted = await decryptChatMessage(
                sharedKey,
                data.encryptedContent.iv,
                data.encryptedContent.ciphertext
              );

              setMessages(prev => [...prev, {
                from: data.from,
                to: username,
                content: decrypted,
                timestamp: Date.now(),
              }]);
            } catch (err) {
              console.error('Failed to decrypt message:', err);
            }
            break;
        }
      };
    }

    connect();
  }, [username]);

  async function startChat(targetUser: string) {
    console.log('Starting chat with:', targetUser);
    if (!wsRef.current || !keyPairRef.current) {
      console.error('Missing WebSocket or KeyPair:', {
        hasWebSocket: !!wsRef.current,
        hasKeyPair: !!keyPairRef.current
      });
      return;
    }
    setSelectedUser(targetUser);

    try {
      const pubKeyB64 = await exportChatPublicKey(keyPairRef.current.publicKey);
      console.log('Sending key exchange request');
      wsRef.current.send(JSON.stringify({
        type: 'keyexchange',
        to: targetUser,
        publicKey: pubKeyB64,
      }));
    } catch (err) {
      console.error('Failed to start chat:', err);
    }
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    console.log('Send message attempt:', { 
      hasMessage: !!message, 
      selectedUser, 
      wsState: wsRef.current?.readyState,
      username 
    });

    if (!message || !selectedUser || !wsRef.current || !username) {
      console.warn('Missing required fields');
      return;
    }

    if (wsRef.current.readyState !== WebSocket.OPEN) {
      console.error('WebSocket not connected');
      setStatus('disconnected');
      return;
    }

    const sharedKey = sessionManagerRef.current.getSession(selectedUser);
    if (!sharedKey) {
      console.warn('No shared key - initiating key exchange');
      await startChat(selectedUser);
      return;
    }

    try {
      console.log('Encrypting message...');
      const encrypted = await encryptChatMessage(sharedKey, message);
      console.log('Message encrypted successfully');

      const payload = {
        type: 'chat',
        to: selectedUser,
        encryptedContent: encrypted,
      };
      wsRef.current.send(JSON.stringify(payload));

      setMessages(prev => [...prev, {
        from: username,
        to: selectedUser,
        content: message,
        timestamp: Date.now(),
      }]);
      setMessage('');
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  }

  const chatMessages = messages.filter(
    m =>
      (m.from === selectedUser && m.to === username) ||
      (m.from === username && m.to === selectedUser)
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-950 text-white flex">
      {/* Sidebar */}
      <div className="w-72 bg-gray-900/70 backdrop-blur-lg border-r border-gray-800 flex flex-col">
        <div className="p-4 border-b border-gray-700">
          <h1 className="text-2xl font-semibold tracking-tight">Encrypted Chat</h1>
          <p className="text-sm text-gray-400">{status === 'connected' ? '🟢 Connected' : '🔴 Reconnecting...'}</p>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          <h2 className="text-sm font-semibold text-gray-400 mb-2">Online Users</h2>
          {onlineUsers.length === 0 && (
            <p className="text-gray-500 text-sm">No users online</p>
          )}
          {onlineUsers.map(u => (
            <button
              key={u}
              onClick={() => startChat(u)}
              className={`block w-full text-left px-4 py-2 rounded-md mb-1 transition-all ${
                selectedUser === u
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                  : 'hover:bg-gray-800 text-gray-300'
              }`}
            >
              @{u}
            </button>
          ))}
        </div>
      </div>

      {/* Chat window */}
      <div className="flex-1 flex flex-col">
        <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-gray-900/50 backdrop-blur-md">
          <div>
            <h2 className="text-lg font-semibold">
              {selectedUser ? `Chat with @${selectedUser}` : 'Select a user'}
            </h2>
            <p className="text-xs text-gray-500">{username && `Logged in as @${username}`}</p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {chatMessages.map((msg, i) => (
            <div key={i} className={`flex ${msg.from === username ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[70%] p-3 rounded-2xl transition-all ${
                  msg.from === username
                    ? 'bg-blue-600 text-white rounded-br-none'
                    : 'bg-gray-800 text-gray-100 rounded-bl-none'
                }`}
              >
                <p className="text-sm leading-relaxed">{msg.content}</p>
                <span className="block text-xs text-gray-400 mt-1 text-right">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={sendMessage} className="border-t border-gray-800 p-4 bg-gray-900/50 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder={selectedUser ? 'Type your message...' : 'Select a user to start chatting'}
              disabled={!selectedUser}
              className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={!selectedUser || !message}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium disabled:opacity-50 transition-all"
            >
              Send
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
