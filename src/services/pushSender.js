/**
 * pushSender.js
 *
 * Sends a Web Push notification to a specific user by calling
 * the Supabase Edge Function "send-push".
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL

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

/** Notify patient: new exercise assigned */
export function notifyNewExercise(session, patientId, exerciseTitle) {
  return sendPushToUser(session, patientId, {
    title: 'Novo exercício disponível 📋',
    body:  `"${exerciseTitle}" foi atribuído para você.`,
    url:   '/exercises',
    tag:   'new-exercise',
  })
}

/** Notify therapist: patient completed an exercise */
export function notifyExerciseCompleted(session, therapistId, patientName, exerciseTitle) {
  return sendPushToUser(session, therapistId, {
    title: `${patientName} concluiu um exercício ✅`,
    body:  `"${exerciseTitle}" foi respondido.`,
    url:   '/patients',
    tag:   'exercise-completed',
  })
}

/** Notify therapist: patient saved a diary entry */
export function notifyDiaryEntry(session, therapistId, patientName) {
  return sendPushToUser(session, therapistId, {
    title: `${patientName} registou no diário 📓`,
    body:  'Uma nova entrada foi adicionada ao diário emocional.',
    url:   '/patients',
    tag:   'diary-entry',
  })
}
