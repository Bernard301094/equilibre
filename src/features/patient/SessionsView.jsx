import { useState, useEffect } from 'react';
import db from '../../services/db';
import { toLocalDateStr } from '../../utils/dates';
import { useOfflineCache, cacheWrite, cacheRead } from '../../hooks/useOfflineCache';
import EmptyState from '../../components/ui/EmptyState';
import './SessionsView.css';

const STATUS_LABEL = {
  scheduled: { emoji: '📌', label: 'Agendada',  cls: 'sess-status--scheduled' },
  done:      { emoji: '✅', label: 'Realizada',  cls: 'sess-status--done'      },
  cancelled: { emoji: '❌', label: 'Cancelada',  cls: 'sess-status--cancelled' },
};

function formatDay(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  const day   = d.toLocaleDateString('pt-BR', { day: '2-digit' });
  const month = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
  const week  = d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
  return { day, month, week };
}

export default function SessionsView({ session }) {
  const today = toLocalDateStr();
  const { isOffline } = useOfflineCache();
  const [sessions, setSessions] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState('upcoming');

  useEffect(() => {
    let active = true;
    const CACHE_KEY = `sessions_${session.id}`;

    const load = async () => {
      if (isOffline) {
        const cached = cacheRead(CACHE_KEY);
        if (cached) { setSessions(cached); setLoading(false); return; }
      }
      try {
        const data = await db.query(
          'sessions',
          { filter: { patient_id: session.id }, order: 'date.asc' },
          session.access_token
        );
        const list = Array.isArray(data) ? data : [];
        if (active) setSessions(list);
        cacheWrite(CACHE_KEY, list);
      } catch (e) {
        const cached = cacheRead(CACHE_KEY);
        if (cached && active) setSessions(cached);
        console.error('[SessionsView]', e);
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => { active = false; };
  }, [session.id, session.access_token, isOffline]);

  const upcoming  = sessions.filter((s) => s.date >= today && s.status !== 'cancelled');
  const displayed = filter === 'upcoming' ? upcoming : sessions;
  const next      = upcoming[0];

  if (loading) return (
    <div className="sess-loading">
      <span>📅</span>
      <p>Carregando sessões...</p>
    </div>
  );

  return (
    <div className="sess-view page-fade-in">

      {isOffline && (
        <div className="sess-offline-banner" role="alert">
          📴 Você está offline — exibindo dados em cache
        </div>
      )}

      <header className="sess-header">
        <h2 className="sess-title">📅 Minhas Sessões</h2>
        <div className="sess-filter">
          <button
            className={`sess-filter-btn${filter === 'upcoming' ? ' sess-filter-btn--active' : ''}`}
            onClick={() => setFilter('upcoming')}
          >
            Próximas ({upcoming.length})
          </button>
          <button
            className={`sess-filter-btn${filter === 'all' ? ' sess-filter-btn--active' : ''}`}
            onClick={() => setFilter('all')}
          >
            Todas ({sessions.length})
          </button>
        </div>
      </header>

      {/* Banner da próxima sessão */}
      {next && (
        <div className="sess-next-card">
          <div className="sess-next-icon" aria-hidden="true">📅</div>
          <div className="sess-next-info">
            <p className="sess-next-label">Próxima sessão</p>
            <p className="sess-next-date">
              {new Date(next.date + 'T12:00:00').toLocaleDateString('pt-BR', {
                weekday: 'long', day: 'numeric', month: 'long',
              })}
              {next.time ? ` · ${next.time}` : ''}
            </p>
            {next.notes && <p className="sess-next-notes">{next.notes}</p>}
          </div>
        </div>
      )}

      {displayed.length === 0 ? (
        <EmptyState
          icon="📋"
          message={filter === 'upcoming' ? 'Nenhuma sessão agendada.' : 'Nenhuma sessão registrada.'}
        />
      ) : (
        <ul className="sess-list">
          {displayed.map((s) => {
            const st     = STATUS_LABEL[s.status] ?? STATUS_LABEL.scheduled;
            const isPast = s.date < today;
            const { day, month, week } = formatDay(s.date);
            return (
              <li key={s.id} className={`sess-card${isPast ? ' sess-card--past' : ''}`}>

                {/* Coluna de data */}
                <div className="sess-card-left">
                  <span className="sess-card-day">
                    {day}
                    <br />
                    <span style={{ fontSize: '.68rem', opacity: .85 }}>{month}</span>
                  </span>
                  <span className="sess-card-time">{week}</span>
                </div>

                {/* Conteúdo */}
                <div className="sess-card-body">
                  <span className={`sess-status ${st.cls}`}>{st.emoji} {st.label}</span>
                  {s.time && (
                    <span style={{ fontSize: '.82rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                      🕐 {s.time}
                    </span>
                  )}
                  {s.notes && <p className="sess-card-notes">{s.notes}</p>}
                </div>

              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
