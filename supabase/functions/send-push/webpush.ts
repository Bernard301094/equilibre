/**
 * Minimal Web Push sender for Deno / Supabase Edge Functions.
 * Uses the Web Crypto API (available in Deno) to sign VAPID JWTs.
 */

interface VapidOptions {
  vapidPublicKey: string
  vapidPrivateKey: string
  vapidEmail: string
}

interface PushSubscription {
  endpoint: string
  keys: { p256dh: string; auth: string }
}

function base64UrlToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const bin = atob(b64)
  return Uint8Array.from([...bin].map((c) => c.charCodeAt(0)))
}

function uint8ArrayToBase64Url(bytes: Uint8Array): string {
  let bin = ''
  bytes.forEach((b) => (bin += String.fromCharCode(b)))
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

async function buildVapidAuthHeader(
  endpoint: string,
  opts: VapidOptions
): Promise<string> {
  const url      = new URL(endpoint)
  const audience = `${url.protocol}//${url.host}`
  const expiry   = Math.floor(Date.now() / 1000) + 12 * 3600

  const header  = { typ: 'JWT', alg: 'ES256' }
  const payload = { aud: audience, exp: expiry, sub: opts.vapidEmail }

  const encode = (obj: object) =>
    uint8ArrayToBase64Url(new TextEncoder().encode(JSON.stringify(obj)))

  const unsigned = `${encode(header)}.${encode(payload)}`

  const privateKeyBytes = base64UrlToUint8Array(opts.vapidPrivateKey)
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    privateKeyBytes,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  )

  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    cryptoKey,
    new TextEncoder().encode(unsigned)
  )

  const jwt = `${unsigned}.${uint8ArrayToBase64Url(new Uint8Array(signature))}`
  return `vapid t=${jwt}, k=${opts.vapidPublicKey}`
}

export async function sendWebPush(
  subscription: PushSubscription,
  payload: string,
  opts: VapidOptions
): Promise<void> {
  const authHeader = await buildVapidAuthHeader(subscription.endpoint, opts)

  const res = await fetch(subscription.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/octet-stream',
      Authorization:   authHeader,
      TTL:             '86400',
    },
    body: new TextEncoder().encode(payload),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Push service error ${res.status}: ${text}`)
  }
}
