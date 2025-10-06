import {
  generateAesKey,
  exportAesRaw,
  importAesRaw,
  aesGcmEncrypt,
  aesGcmDecrypt,
  importPublicEncKeyFromJwk,
  importPrivateEncKeyFromJwk,
  wrapKeyWithPublicKey,
  unwrapKeyWithPrivateKey,
  uint8ArrayToBase64,
  base64ToUint8Array,
  utf8ToUint8Array,
} from './crypto'

// Send an encrypted message from `fromUser` to `toUser`. All storage in localStorage for demo.
export async function sendEncryptedMessage(fromUser: string, toUser: string, plaintext: string) {
  // lookup recipient public encryption key
  const reg = JSON.parse(localStorage.getItem('mock_registry') || '{}')
  const recipientEncJwk = reg[`${toUser}:enc`]
  if (!recipientEncJwk) throw new Error('Recipient has no encryption key')

  const pubEncKey = await importPublicEncKeyFromJwk(recipientEncJwk)

  // generate AES key and encrypt message
  const aes = await generateAesKey()
  const pt = utf8ToUint8Array(plaintext)
  const { iv, ciphertext } = await aesGcmEncrypt(aes, pt)

  // export and wrap AES key with recipient public key
  const wrapped = await wrapKeyWithPublicKey(aes, pubEncKey)

  // store as base64
  const msg = {
    from: fromUser,
    to: toUser,
    iv: uint8ArrayToBase64(iv),
    ciphertext: uint8ArrayToBase64(ciphertext),
    wrappedKey: uint8ArrayToBase64(new Uint8Array(wrapped)),
    ts: Date.now(),
  }

  const msgs = JSON.parse(localStorage.getItem('mock_messages') || '[]')
  msgs.push(msg)
  localStorage.setItem('mock_messages', JSON.stringify(msgs))
  return msg
}

export async function fetchAndDecryptMessages(forUser: string) {
  const msgs = JSON.parse(localStorage.getItem('mock_messages') || '[]')
  const myMsgs = msgs.filter((m: any) => m.to === forUser)

  const privRaw = localStorage.getItem(`mock_priv_key_jwk:${forUser}`)
  const privEncRaw = localStorage.getItem(`mock_priv_enc_key_jwk:${forUser}`)
  if (!privRaw || !privEncRaw) return []

  const privEncJwk = JSON.parse(privEncRaw)
  const privEncKey = await importPrivateEncKeyFromJwk(privEncJwk)

  const out: any[] = []
  for (const m of myMsgs) {
    try {
      const wrapped = base64ToUint8Array(m.wrappedKey)
      const aes = await unwrapKeyWithPrivateKey(wrapped.buffer, privEncKey)
      const iv = base64ToUint8Array(m.iv)
      const ct = base64ToUint8Array(m.ciphertext)
      const pt = await aesGcmDecrypt(aes, iv, ct)
      out.push({ ...m, plaintext: new TextDecoder().decode(pt) })
    } catch (e) {
      // skip
    }
  }
  return out
}
