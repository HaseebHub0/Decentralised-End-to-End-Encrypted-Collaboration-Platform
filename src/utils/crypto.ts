// Minimal WebCrypto helpers for RSA-OAEP (encryption) and RSA-PSS (signing)
export async function generateSigningKeyPair() {
  const kp = await (crypto.subtle as any).generateKey(
    {
      name: 'RSA-PSS',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['sign', 'verify']
  )
  return kp
}

export async function exportPublicKeyToJwk(key: CryptoKey) {
  return await (crypto.subtle as any).exportKey('jwk', key)
}

export async function importPublicKeyFromJwk(jwk: JsonWebKey) {
  return await (crypto.subtle as any).importKey(
    'jwk',
    jwk,
    { name: 'RSA-PSS', hash: 'SHA-256' },
    true,
    ['verify']
  )
}

// --- RSA-OAEP (encryption) helpers
export async function generateEncryptionKeyPair() {
  const kp = await (crypto.subtle as any).generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['encrypt', 'decrypt']
  )
  return kp
}

export async function exportPublicEncKeyToJwk(key: CryptoKey) {
  return await (crypto.subtle as any).exportKey('jwk', key)
}

export async function importPublicEncKeyFromJwk(jwk: JsonWebKey) {
  return await (crypto.subtle as any).importKey(
    'jwk',
    jwk,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    true,
    ['encrypt']
  )
}

export async function exportPrivateEncKeyToJwk(key: CryptoKey) {
  return await crypto.subtle.exportKey('jwk', key)
}

export async function importPrivateEncKeyFromJwk(jwk: JsonWebKey) {
  return await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    true,
    ['decrypt']
  )
}

// AES-GCM helpers
export async function generateAesKey() {
  return await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt'])
}

export async function exportAesRaw(key: CryptoKey) {
  return await crypto.subtle.exportKey('raw', key)
}

export async function importAesRaw(raw: ArrayBuffer) {
  return await crypto.subtle.importKey('raw', raw, 'AES-GCM', true, ['decrypt', 'encrypt'])
}

export async function aesGcmEncrypt(rawKey: CryptoKey, plaintext: Uint8Array | ArrayBuffer) {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ptView = plaintext instanceof Uint8Array ? new Uint8Array(plaintext) : new Uint8Array(plaintext)
  // Make copies so we have plain ArrayBuffer instances (avoids SharedArrayBuffer typing)
  const ivBuf = iv.slice().buffer as ArrayBuffer
  const ptBuf = ptView.slice().buffer as ArrayBuffer
  const ctBuf = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: ivBuf }, rawKey, ptBuf)
  return { iv: new Uint8Array(ivBuf), ciphertext: new Uint8Array(ctBuf) }
}

export async function aesGcmDecrypt(
  rawKey: CryptoKey,
  ivInput: Uint8Array | ArrayBuffer,
  ciphertext: Uint8Array | ArrayBuffer
): Promise<Uint8Array> {
  // Force iv into a real Uint8Array backed by an ArrayBuffer
  const ivArr = ivInput instanceof Uint8Array ? new Uint8Array(ivInput) : new Uint8Array(ivInput)
  const ctView = ciphertext instanceof Uint8Array ? new Uint8Array(ciphertext) : new Uint8Array(ciphertext)
  const ivBuf = ivArr.slice().buffer as ArrayBuffer
  const ctBuf = ctView.slice().buffer as ArrayBuffer
  const ptBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: ivBuf }, rawKey, ctBuf)
  return new Uint8Array(ptBuf)
}




export async function wrapKeyWithPublicKey(key: CryptoKey, publicKey: CryptoKey) {
  // wrap as raw
  return await crypto.subtle.wrapKey('raw', key, publicKey, { name: 'RSA-OAEP' })
}

export async function unwrapKeyWithPrivateKey(wrapped: ArrayBuffer, privateKey: CryptoKey) {
  return await crypto.subtle.unwrapKey('raw', wrapped, privateKey, { name: 'RSA-OAEP' }, { name: 'AES-GCM', length: 256 }, true, ['decrypt'])
}

export async function exportPrivateKeyToJwk(key: CryptoKey) {
  return await crypto.subtle.exportKey('jwk', key)
}

export async function importPrivateKeyFromJwk(jwk: JsonWebKey) {
  return await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'RSA-PSS', hash: 'SHA-256' },
    true,
    ['sign']
  )
}

export async function signData(privateKey: CryptoKey, data: Uint8Array | ArrayBuffer) {
  const view = data instanceof Uint8Array ? new Uint8Array(data) : new Uint8Array(data)
  const buf = view.slice().buffer as ArrayBuffer
  return await crypto.subtle.sign({ name: 'RSA-PSS', saltLength: 32 }, privateKey, buf)
}

export async function verifySignature(publicKey: CryptoKey, data: Uint8Array | ArrayBuffer, sig: ArrayBuffer) {
  const view = data instanceof Uint8Array ? new Uint8Array(data) : new Uint8Array(data)
  const buf = view.slice().buffer as ArrayBuffer
  return await crypto.subtle.verify({ name: 'RSA-PSS', saltLength: 32 }, publicKey, sig, buf)
}

export function utf8ToUint8Array(s: string) {
  return new TextEncoder().encode(s)
}

export function uint8ArrayToBase64(u: Uint8Array | ArrayBuffer) {
  const bytes = new Uint8Array(u instanceof ArrayBuffer ? u : u)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}

export function base64ToUint8Array(b64: string) {
  const binary = atob(b64)
  const len = binary.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}
