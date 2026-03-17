import { useState } from 'react'
import { usePushNotifications } from '../../hooks/usePushNotifications'

/**
 * Banner that asks the user to enable push notifications.
 * Shows only if:
 *   - Web Push is supported in the browser
 *   - Permission hasn't been granted yet
 *   - User hasn't dismissed the prompt this session
 *
 * Usage: <PushNotificationPrompt session={session} />
 */
export default function PushNotificationPrompt({ session, setView }) {
  const { supported, permission, subscribed, subscribe } = usePushNotifications({ session, setView })
  const [dismissed, setDismissed] = useState(false)
  const [loading,   setLoading]   = useState(false)
  const [done,      setDone]      = useState(false)

  // Don't show if: not supported, already granted/denied, subscribed, or dismissed
  if (!supported || permission === 'granted' || permission === 'denied' || subscribed || dismissed || done) {
    return null
  }

  const handleEnable = async () => {
    setLoading(true)
    const result = await subscribe()
    setLoading(false)
    if (result.ok) setDone(true)
  }

  return (
    <div style={{
      position:     'fixed',
      bottom:       '80px',   // above mobile bottom nav
      left:         '50%',
      transform:    'translateX(-50%)',
      width:        'min(92vw, 420px)',
      background:   '#fff',
      border:       '1px solid #e5e7eb',
      borderRadius: '16px',
      boxShadow:    '0 8px 32px rgba(0,0,0,0.12)',
      padding:      '16px 20px',
      zIndex:       9999,
      display:      'flex',
      alignItems:   'flex-start',
      gap:          '12px',
    }}>
      {/* Icon */}
      <span style={{ fontSize: '28px', flexShrink: 0 }}>🔔</span>

      {/* Text */}
      <div style={{ flex: 1 }}>
        <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: '14px', color: '#111827' }}>
          Ativar notificações push
        </p>
        <p style={{ margin: '0 0 12px', fontSize: '13px', color: '#6b7280', lineHeight: 1.4 }}>
          Receba avisos de novos exercícios e mensagens mesmo com o app fechado.
        </p>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={handleEnable}
            disabled={loading}
            style={{
              padding:      '7px 16px',
              background:   loading ? '#a5b4fc' : '#6366f1',
              color:        '#fff',
              border:       'none',
              borderRadius: '8px',
              fontWeight:   600,
              fontSize:     '13px',
              cursor:       loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Ativando...' : 'Ativar agora'}
          </button>

          <button
            onClick={() => setDismissed(true)}
            style={{
              padding:      '7px 12px',
              background:   'transparent',
              color:        '#9ca3af',
              border:       '1px solid #e5e7eb',
              borderRadius: '8px',
              fontSize:     '13px',
              cursor:       'pointer',
            }}
          >
            Agora não
          </button>
        </div>
      </div>

      {/* Close */}
      <button
        onClick={() => setDismissed(true)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: '16px', padding: 0 }}
        aria-label="Fechar"
      >
        ✕
      </button>
    </div>
  )
}
