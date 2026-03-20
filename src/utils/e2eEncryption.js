/**
 * e2eEncryption.js
 * Gestión de claves E2E usando Web Crypto API (AES-GCM 256-bit)
 * Las claves NUNCA se envían al servidor.
 */

/**
 * Genera un par de claves ECDH para intercambio seguro entre peers.
 */
export async function generateECDHKeyPair() {
  return await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveKey']
  );
}

/**
 * Exporta la clave pública en formato raw para compartir con el peer.
 */
export async function exportPublicKey(publicKey) {
  const raw = await crypto.subtle.exportKey('raw', publicKey);
  return btoa(String.fromCharCode(...new Uint8Array(raw)));
}

/**
 * Importa la clave pública recibida del peer.
 */
export async function importPublicKey(base64Key) {
  const raw = Uint8Array.from(atob(base64Key), (c) => c.charCodeAt(0));
  return await crypto.subtle.importKey(
    'raw',
    raw,
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    []
  );
}

/**
 * Deriva una clave AES-GCM compartida a partir de la clave privada propia
 * y la clave pública del peer.
 */
export async function deriveSharedKey(privateKey, peerPublicKey) {
  return await crypto.subtle.deriveKey(
    { name: 'ECDH', public: peerPublicKey },
    privateKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Cifra datos con AES-GCM usando la clave compartida.
 * Retorna { iv, ciphertext } en base64.
 */
export async function encryptData(sharedKey, data) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(data);
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    sharedKey,
    encoded
  );
  return {
    iv: btoa(String.fromCharCode(...iv)),
    ciphertext: btoa(String.fromCharCode(...new Uint8Array(ciphertext))),
  };
}

/**
 * Descifra datos con AES-GCM usando la clave compartida.
 */
export async function decryptData(sharedKey, iv, ciphertext) {
  const ivBytes = Uint8Array.from(atob(iv), (c) => c.charCodeAt(0));
  const cipherBytes = Uint8Array.from(atob(ciphertext), (c) => c.charCodeAt(0));
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: ivBytes },
    sharedKey,
    cipherBytes
  );
  return new TextDecoder().decode(decrypted);
}
