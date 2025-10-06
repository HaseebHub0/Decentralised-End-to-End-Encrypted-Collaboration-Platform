// ECDH (X25519) key exchange and E2EE chat functions
import { base64ToUint8Array, uint8ArrayToBase64, utf8ToUint8Array } from './crypto';

// TypeScript types for chat protocol messages
export interface KeyExchangeMessage {
  type: 'keyexchange';
  to: string;
  publicKey: string; // base64 encoded public key
}

export interface ChatMessage {
  type: 'chat';
  to: string;
  encryptedContent: {
    iv: string; // base64
    ciphertext: string; // base64
  };
}

export interface StatusMessage {
  type: 'status';
  users: string[];
}

// Generate an ECDH key pair for X25519 key exchange
export async function generateChatKeyPair(): Promise<CryptoKeyPair> {
  return await crypto.subtle.generateKey(
    {
      name: 'ECDH',
      namedCurve: 'P-256'
    },
    true,
    ['deriveKey', 'deriveBits']
  );
}

// Export a chat public key to base64 for transmission
export async function exportChatPublicKey(key: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey('raw', key);
  return uint8ArrayToBase64(new Uint8Array(raw));
}

// Import a received public key from base64
export async function importChatPublicKey(b64Key: string): Promise<CryptoKey> {
  const keyData = base64ToUint8Array(b64Key);
  return await crypto.subtle.importKey(
    'raw',
    keyData,
    {
      name: 'ECDH',
      namedCurve: 'P-256'
    },
    false,
    []
  );
}

// Derive a shared AES-256-GCM key from ECDH
export async function deriveSharedKey(
  privateKey: CryptoKey,
  publicKey: CryptoKey
): Promise<CryptoKey> {
  // First derive shared bits
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'ECDH',
      public: publicKey
    },
    privateKey,
    256
  );

  // Import as AES-GCM key
  return await crypto.subtle.importKey(
    'raw',
    derivedBits,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

// Encrypt a chat message using AES-GCM with the shared key
export async function encryptChatMessage(
  sharedKey: CryptoKey,
  message: string
): Promise<{ iv: string; ciphertext: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = utf8ToUint8Array(message);

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    sharedKey,
    plaintext
  );

  return {
    iv: uint8ArrayToBase64(iv),
    ciphertext: uint8ArrayToBase64(new Uint8Array(ciphertext))
  };
}

// Decrypt a chat message using AES-GCM with the shared key
export async function decryptChatMessage(
  sharedKey: CryptoKey,
  iv: string,
  ciphertext: string
): Promise<string> {
  const ivArray = base64ToUint8Array(iv);
  const ciphertextArray = base64ToUint8Array(ciphertext);

  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: ivArray },
    sharedKey,
    ciphertextArray
  );

  return new TextDecoder().decode(plaintext);
}

// Manage chat sessions and derived keys
export class ChatSessionManager {
  private sessions = new Map<string, {
    sharedKey: CryptoKey;
    timestamp: number;
  }>();

  constructor(private readonly keyRotationInterval = 1000 * 60 * 15) {} // 15 minutes

  async setSession(username: string, sharedKey: CryptoKey) {
    this.sessions.set(username, {
      sharedKey,
      timestamp: Date.now()
    });
  }

  getSession(username: string) {
    const session = this.sessions.get(username);
    if (!session) return null;

    // Check if key needs rotation
    if (Date.now() - session.timestamp > this.keyRotationInterval) {
      this.sessions.delete(username);
      return null;
    }

    return session.sharedKey;
  }

  clearSession(username: string) {
    this.sessions.delete(username);
  }
}