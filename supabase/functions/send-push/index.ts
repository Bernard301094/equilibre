/**
 * Supabase Edge Function: send-push
 *
 * Receives a push payload, fetches the user's push subscription
 * from the database, and sends a Web Push notification using VAPID.
 *
 * Deploy with:
 *   supabase functions deploy send-push
 *
 * Required secrets (set via Supabase dashboard or CLI):
 *   supabase secrets set VAPID_PUBLIC_KEY=...
 *   supabase secrets set VAPID_PRIVATE_KEY=...
 *   supabase secrets set VAPID_EMAIL=mailto:you@example.com
 *   supabase secrets set SUPABASE_SERVICE_KEY=...
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const VAPID_PUBLIC_KEY  = Deno.env.get('VAPID_PUBLIC_KEY')  ?? ''
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') ?? ''
const VAPID_EMAIL       = Deno.env.get('VAPID_EMAIL')       ?? 'mailto:admin@equilibre.app'
const SUPABASE_URL      = Deno.env.get('SUPABASE_URL')      ?? ''
const SERVICE_KEY       = Deno.env.get('SUPABASE_SERVICE_KEY') ?? ''

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, content-type',
      },
    })
  }

  try {
    const { userId, title, body, url, tag, icon, badge } = await req.json()

    if (!userId) {
      return new Response(JSON.stringify({ error: 'userId is required' }), { status: 400 })
    }

    // Fetch push subscription for this user
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY)
    const { data: rows, error } = await supabase
      .from('push_subscriptions')
      .select('subscription')
      .eq('user_id', userId)
      .limit(1)

    if (error || !rows || rows.length === 0) {
      return new Response(JSON.stringify({ error: 'No subscription found' }), { status: 404 })
    }

    const subscription = rows[0].subscription

    // Build the push payload
    const pushPayload = JSON.stringify({ title, body, url: url ?? '/', tag, icon, badge })

    // Send via Web Push (using Deno's built-in crypto for VAPID signing)
    const { sendWebPush } = await import('./webpush.ts')
    await sendWebPush(subscription, pushPayload, {
      vapidPublicKey:  VAPID_PUBLIC_KEY,
      vapidPrivateKey: VAPID_PRIVATE_KEY,
      vapidEmail:      VAPID_EMAIL,
    })

    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error('[send-push]', e)
    return new Response(JSON.stringify({ error: e.message }), { status: 500 })
  }
})
