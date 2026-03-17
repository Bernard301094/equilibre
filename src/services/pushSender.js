/**
 * pushSender.js
 *
 * Sends a Web Push notification to a specific user by calling
 * the Supabase Edge Function "send-push".
 *
 * The Edge Function handles the actual VAPID signing server-side
 * so the private key is never exposed to the browser.
 *
 * Usage:
 *   import { sendPushToUser } from '../services/pushSender'
 *
 *   await sendPushToUser(session, targetUserId, {
 *     title: 'Novo exercício 📋',
 *     body:  'Sua terapeuta enviou um novo exercício para você.',
 *     url:   '/exercises',
 *   })
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL

/**
 * @param {object} session        - Current user session (access_token required)
 * @param {string} targetUserId   - UUID of the user to notify
 * @param {{ title: string, body: string, url?: string, tag?: string }} payload
 * @returns {Promise<{ ok: boolean, error?: string }>}
 */
export async function sendPushToUser(session, targetUserId, payload) {
  if (!SUPABASE_URL) {
    console.error('[pushSender] VITE_SUPABASE_URL not set')
    return { ok: false, error: 'missing_supabase_url' }
  }

  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        userId: targetUserId,
        title:  payload.title  ?? 'Equilibre',
        body:   payload.body   ?? 'Você tem uma nova atualização.',
        url:    payload.url    ?? '/',
        tag:    payload.tag    ?? 'equilibre-default',
        icon:   '/icon-192.png',
        badge:  '/icon-192.png',
      }),
    })

    if (!res.ok) {
      const text = await res.text()
      console.warn('[pushSender] Edge Function error:', text)
      return { ok: false, error: text }
    }

    return { ok: true }
  } catch (e) {
    console.error('[pushSender] Network error:', e)
    return { ok: false, error: e.message }
  }
}

/**
 * Convenience: notify a patient that a new exercise was assigned.
 */
export function notifyNewExercise(session, patientId, exerciseTitle) {
  return sendPushToUser(session, patientId, {
    title: 'Novo exercício disponível 📋',
    body:  `"${exerciseTitle}" foi atribuído para você.`,
    url:   '/exercises',
    tag:   'new-exercise',
  })
}

/**
 * Convenience: notify a therapist that a patient completed an exercise.
 */
export function notifyExerciseCompleted(session, therapistId, patientName, exerciseTitle) {
  return sendPushToUser(session, therapistId, {
    title: `${patientName} concluiu um exercício ✅`,
    body:  `"${exerciseTitle}" foi respondido.`,
    url:   '/patients',
    tag:   'exercise-completed',
  })
}
