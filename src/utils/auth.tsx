import React, { createContext, useContext, useEffect, useState } from 'react'
import {
  generateSigningKeyPair,
  exportPublicKeyToJwk,
  exportPrivateKeyToJwk,
  importPrivateKeyFromJwk,
  signData,
  utf8ToUint8Array,
  base64ToUint8Array,
  uint8ArrayToBase64,
  importPublicKeyFromJwk,
} from './crypto'

type User = { username: string; publicJwk?: JsonWebKey }

type AuthContext = {
  user: User | null
  login: (username: string) => Promise<boolean>
  logout: () => void
  register: (username: string) => Promise<void>
}

const ctx = createContext<AuthContext | undefined>(undefined)

const PRIVATE_KEY_STORAGE = 'mock_priv_key_jwk'

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const raw = localStorage.getItem('mock_user')
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  })

  useEffect(() => {
    if (user) localStorage.setItem('mock_user', JSON.stringify(user))
    else localStorage.removeItem('mock_user')
  }, [user])

  const logout = () => setUser(null)

  // Register: generate key pair, store private key locally (JWK), publish public JWK to mock registry
  const register = async (username: string) => {
    const kp = await generateSigningKeyPair()
    const pubJwk = await exportPublicKeyToJwk(kp.publicKey)
    const privJwk = await exportPrivateKeyToJwk(kp.privateKey)
    // store private key JWK locally (in real app encrypt / use secure storage)
    localStorage.setItem(`${PRIVATE_KEY_STORAGE}:${username}`, JSON.stringify(privJwk))

    // also generate encryption key pair
    const encKp = await (await import('./crypto')).generateEncryptionKeyPair()
    const pubEnc = await (await import('./crypto')).exportPublicEncKeyToJwk(encKp.publicKey)
    const privEnc = await (await import('./crypto')).exportPrivateEncKeyToJwk(encKp.privateKey)
    localStorage.setItem(`mock_priv_enc_key_jwk:${username}`, JSON.stringify(privEnc))

    // publish public key to registry (mock server)
  const reg = JSON.parse(localStorage.getItem('mock_registry') || '{}')
  reg[username] = pubJwk
  reg[`${username}:enc`] = pubEnc
  localStorage.setItem('mock_registry', JSON.stringify(reg))

    setUser({ username, publicJwk: pubJwk })
  }

  // Login: fetch public key (mock server), load private key locally and perform challenge-response by signing a server challenge
  const login = async (username: string) => {
    const reg = JSON.parse(localStorage.getItem('mock_registry') || '{}')
    const pubJwk = reg[username]
    if (!pubJwk) return false

    const privRaw = localStorage.getItem(`${PRIVATE_KEY_STORAGE}:${username}`)
    if (!privRaw) return false
    const privJwk = JSON.parse(privRaw)

    // Simulate server challenge
    const challenge = 'challenge:' + Math.random().toString(36).slice(2)
    const data = utf8ToUint8Array(challenge)

    const privKey = await importPrivateKeyFromJwk(privJwk)
    const sig = await signData(privKey, data)

    // server would import public key and verify
    const pubKey = await importPublicKeyFromJwk(pubJwk)
    const ok = await (await import('./crypto')).verifySignature(pubKey, data, sig)
    if (!ok) return false

    setUser({ username, publicJwk: pubJwk })
    return true
  }

  return <ctx.Provider value={{ user, login, logout, register }}>{children}</ctx.Provider>
}

export const useAuth = () => {
  const v = useContext(ctx)
  if (!v) throw new Error('useAuth must be used within AuthProvider')
  return v
}
