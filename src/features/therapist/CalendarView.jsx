import { useState, useEffect } from 'react';
import db from '../../services/db';
import { toLocalDateStr } from '../../utils/dates';
import EmptyState from '../../components/ui/EmptyState';
import './CalendarView.css';

const DAYS_PT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS_PT = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
];

export default function CalendarView({ session }) {
  const today = toLocalDateStr();
  const [sessions,    setSessions]    = useState([]);
  const [patients,    setPatients]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selected,    setSelected]    = useState(null);   // date string 'YYYY-MM-DD'
  const [showModal,   setShowModal]   = useState(false);
  const [form,        setForm]        = useState({ patient_id: '', date: '', time: '09:00', notes: '' });
  const [saving,      setSaving]      = useState(false);
  const [editTarget,  setEditTarget]  = useState(null);

  // ── Cargar datos
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [s, p] = await Promise.all([
          db.query('sessions', { filter: { therapist_id: session.id }, order: 'date.asc' }, session.access_token),
          db.query('users', { filter: { therapist_id: session.id, role: 'patient' }, select: 'id,name' }, session.access_token),
        ]);
        if (!active) return;
        setSessions(Array.isArray(s) ? s : []);
        setPatients(Array.isArray(p) ? p : []);
      } catch (e) {
        console.error('[CalendarView]', e);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [session.id, session.access_token]);

  // ── Helpers del calendario
  const year  = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay   = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const dateStr = (d) => `${year}-${String(month + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  const sessionsOnDay = (d) => sessions.filter((s) => s.date === dateStr(d));

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const openNew = (d) => {
    setEditTarget(null);
    setForm({ patient_id: patients[0]?.id || '', date: dateStr(d), time: '09:00', notes: '' });
    setSelected(dateStr(d));
    setShowModal(true);
  };

  const openEdit = (sess) => {
    setEditTarget(sess);
    setForm({ patient_id: sess.patient_id, date: sess.date, time: sess.time || '09:00', notes: sess.notes || '' });
    setSelected(sess.date);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.patient_id || !form.date) return;
    setSaving(true);
    try {
      const patient = patients.find((p) => p.id === form.patient_id);
      if (editTarget) {
        await db.update('sessions', { id: editTarget.id }, {
          patient_id: form.patient_id,
          date: form.date,
          time: form.time,
          notes: form.notes,
          updated_at: new Date().toISOString(),
        }, session.access_token);
        setSessions((prev) => prev.map((s) =>
          s.id === editTarget.id ? { ...s, ...form, patient_name: patient?.name } : s
        ));
      } else {
        const saved = await db.insert('sessions', {
          therapist_id: session.id,
          patient_id: form.patient_id,
          patient_name: patient?.name || '',
          date: form.date,
          time: form.time,
          notes: form.notes,
          status: 'scheduled',
          created_at: new Date().toISOString(),
        }, session.access_token);
        const entry = saved?.data ?? saved;
        setSessions((prev) => [...prev, { ...form, ...entry, patient_name: patient?.name }]);
      }
      setShowModal(false);
    } catch (e) {
      alert('Erro ao salvar: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (sess) => {
    if (!window.confirm('Excluir esta sessão?')) return;
    await db.delete('sessions', { id: sess.id }, session.access_token);
    setSessions((prev) => prev.filter((s) => s.id !== sess.id));
  };

  const selectedSessions = selected ? sessions.filter((s) => s.date === selected) : [];

  if (loading) return (
    <div className="cal-loading">
      <span>📅</span><p>Carregando agenda...</p>
    </div>
  );

  return (
    <div className="cal-view page-fade-in">
      <header className="cal-header">
        <h2 className="cal-title">📅 Agenda de Sessões</h2>
        <div className="cal-nav">
          <button className="cal-nav-btn" onClick={prevMonth} aria-label="Mês anterior">‹</button>
          <span className="cal-month-label">{MONTHS_PT[month]} {year}</span>
          <button className="cal-nav-btn" onClick={nextMonth} aria-label="Próximo mês">›</button>
        </div>
      </header>

      {/* Grid do calendário */}
      <div className="cal-grid-wrapper">
        <div className="cal-weekdays">
          {DAYS_PT.map((d) => <span key={d} className="cal-weekday">{d}</span>)}
        </div>
        <div className="cal-grid">
          {cells.map((d, i) => {
            if (!d) return <div key={`empty-${i}`} className="cal-cell cal-cell--empty" />;
            const ds     = dateStr(d);
            const daySess = sessionsOnDay(d);
            const isToday    = ds === today;
            const isSelected = ds === selected;
            return (
              <div
                key={ds}
                className={[
                  'cal-cell',
                  isToday    ? 'cal-cell--today'    : '',
                  isSelected ? 'cal-cell--selected' : '',
                  daySess.length ? 'cal-cell--has-session' : '',
                ].filter(Boolean).join(' ')}
                onClick={() => setSelected(isSelected ? null : ds)}
              >
                <span className="cal-cell-day">{d}</span>
                {daySess.length > 0 && (
                  <span className="cal-cell-dot" aria-label={`${daySess.length} sessão(ões)`}>
                    {daySess.length}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Painel lateral: sessões do dia selecionado */}
      {selected && (
        <div className="cal-side">
          <div className="cal-side-header">
            <h3 className="cal-side-title">
              {new Date(selected + 'T12:00:00').toLocaleDateString('pt-BR', {
                weekday: 'long', day: 'numeric', month: 'long'
              })}
            </h3>
            <button className="cal-add-btn" onClick={() => openNew(parseInt(selected.split('-')[2]))}>
              + Nova sessão
            </button>
          </div>

          {selectedSessions.length === 0 ? (
            <EmptyState icon="📋" message="Nenhuma sessão neste dia." />
          ) : (
            <ul className="cal-session-list">
              {selectedSessions.map((s) => (
                <li key={s.id} className="cal-session-card">
                  <div className="cal-session-info">
                    <span className="cal-session-time">🕐 {s.time || '--:--'}</span>
                    <span className="cal-session-patient">👤 {s.patient_name || '—'}</span>
                    {s.notes && <span className="cal-session-notes">{s.notes}</span>}
                    <span className={`cal-session-status cal-session-status--${s.status || 'scheduled'}`}>
                      {s.status === 'done' ? '✅ Realizada' : s.status === 'cancelled' ? '❌ Cancelada' : '📌 Agendada'}
                    </span>
                  </div>
                  <div className="cal-session-actions">
                    <button className="cal-action-btn" onClick={() => openEdit(s)} aria-label="Editar">✏️</button>
                    <button className="cal-action-btn cal-action-btn--delete" onClick={() => handleDelete(s)} aria-label="Excluir">🗑️</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Modal novo/editar */}
      {showModal && (
        <div className="cal-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="cal-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="cal-modal-title">
            <h3 id="cal-modal-title" className="cal-modal-title">
              {editTarget ? '✏️ Editar Sessão' : '📅 Nova Sessão'}
            </h3>

            <label className="cal-modal-label">Paciente
              <select
                className="cal-modal-input"
                value={form.patient_id}
                onChange={(e) => setForm((f) => ({ ...f, patient_id: e.target.value }))}
              >
                <option value="">Selecione...</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </label>

            <label className="cal-modal-label">Data
              <input
                type="date"
                className="cal-modal-input"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              />
            </label>

            <label className="cal-modal-label">Horário
              <input
                type="time"
                className="cal-modal-input"
                value={form.time}
                onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
              />
            </label>

            <label className="cal-modal-label">Observações
              <textarea
                className="cal-modal-input cal-modal-textarea"
                placeholder="Opcional…"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </label>

            <div className="cal-modal-actions">
              <button className="cal-modal-btn cal-modal-btn--cancel" onClick={() => setShowModal(false)}>Cancelar</button>
              <button
                className="cal-modal-btn cal-modal-btn--save"
                onClick={handleSave}
                disabled={saving || !form.patient_id || !form.date}
                aria-busy={saving}
              >
                {saving ? 'Salvando…' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
