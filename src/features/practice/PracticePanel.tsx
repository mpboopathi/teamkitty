import { useState } from 'react'
import type { FormEvent } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { usePracticeSessions } from './usePracticeSessions'
import type { RosterMember } from '../teams/types'
import { rosterMemberName } from '../teams/types'

interface Props {
  teamId: string
  roster: RosterMember[]
  currentUserId: string
}

export function PracticePanel({ teamId, roster, currentUserId }: Props) {
  const { sessions, loading, refresh } = usePracticeSessions(teamId)

  const [location, setLocation] = useState('')
  const [sessionDate, setSessionDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [hours, setHours] = useState('1')
  const [amountPaid, setAmountPaid] = useState('')
  const [paidBy, setPaidBy] = useState(currentUserId)
  const [participantIds, setParticipantIds] = useState<string[]>([currentUserId])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const activeRoster = roster.filter((m) => m.user_id && m.status !== 'inactive')

  function toggleParticipant(userId: string) {
    setParticipantIds((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]))
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    const { error } = await supabase.rpc('create_practice_session', {
      p_team_id: teamId,
      p_session_date: sessionDate,
      p_location: location.trim() || null,
      p_hours_booked: Number(hours),
      p_paid_by: paidBy,
      p_participant_ids: participantIds,
      p_total_cost: amountPaid.trim() ? Number(amountPaid) : null,
    })

    if (error) {
      setError(error.message)
    } else {
      setLocation('')
      setHours('1')
      setAmountPaid('')
      setParticipantIds([currentUserId])
      await refresh()
    }
    setSaving(false)
  }

  async function claim(participantId: string) {
    const { error } = await supabase.rpc('claim_practice_payment', { p_participant_id: participantId })
    if (error) alert(error.message)
    else refresh()
  }

  async function confirm(participantId: string) {
    const { error } = await supabase.rpc('confirm_practice_payment', { p_participant_id: participantId })
    if (error) alert(error.message)
    else refresh()
  }

  if (loading) return <p className="muted">Loading practice sessions…</p>

  return (
    <div>
      <h2 className="section-title" style={{ marginTop: 0 }}>
        🥅 Book a practice session
      </h2>
      <div className="card">
        <form onSubmit={handleCreate} className="form-stack" style={{ maxWidth: 420 }}>
          <label>
            Date
            <input type="date" value={sessionDate} onChange={(e) => setSessionDate(e.target.value)} />
          </label>
          <label>
            Location
            <input placeholder="Location (e.g. XYZ Nets)" value={location} onChange={(e) => setLocation(e.target.value)} />
          </label>
          <label>
            Hours booked
            <input type="number" step="0.5" min="0.5" value={hours} onChange={(e) => setHours(e.target.value)} />
          </label>
          <label>
            Amount actually paid to the nets ($)
            <input
              type="number"
              step="0.01"
              min="0.01"
              placeholder={`leave blank to use the team's default rate`}
              value={amountPaid}
              onChange={(e) => setAmountPaid(e.target.value)}
            />
          </label>
          <p className="hint" style={{ margin: '-0.4rem 0 0' }}>
            Enter what you were actually charged and it'll be split evenly below, no matter what rate that works out
            to. Leave it blank to fall back to the team's default per-hour rate × hours booked.
          </p>
          <label>
            Who paid for the court?
            <select value={paidBy} onChange={(e) => setPaidBy(e.target.value)}>
              {activeRoster.map((m) => (
                <option key={m.user_id} value={m.user_id!}>
                  {rosterMemberName(m)}
                </option>
              ))}
            </select>
          </label>
          <div>
            <p className="hint" style={{ marginBottom: '0.4rem' }}>
              Who attended (cost is split evenly across these):
            </p>
            {activeRoster.map((m) => (
              <label key={m.user_id} style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem', fontWeight: 400 }}>
                <input
                  type="checkbox"
                  checked={participantIds.includes(m.user_id!)}
                  onChange={() => toggleParticipant(m.user_id!)}
                  style={{ width: 'auto' }}
                />
                {rosterMemberName(m)}
              </label>
            ))}
          </div>
          <button type="submit" disabled={saving} className="btn btn-primary">
            {saving ? 'Booking…' : 'Book session'}
          </button>
          {error && <p className="error-text">{error}</p>}
        </form>
      </div>

      <h2 className="section-title">📋 Practice sessions</h2>
      {sessions.length === 0 && <p className="muted">None yet.</p>}
      {sessions.map((s) => (
        <div key={s.id} className="card">
          <p style={{ margin: '0 0 0.6rem' }}>
            <strong>{s.session_date}</strong> — {s.location ?? 'Location TBD'} — {s.hours_booked}h, total ${s.total_cost.toFixed(2)}
            <span className="hint"> (${s.hourly_rate}/hr)</span>, paid by {s.payer?.full_name ?? '—'}
          </p>
          <div className="table-card" style={{ marginBottom: 0 }}>
            <table>
              <tbody>
                {s.practice_participants.map((p) => (
                  <tr key={p.id}>
                    <td>{p.player?.full_name ?? '—'}</td>
                    <td>${p.share_amount.toFixed(2)}</td>
                    <td>
                      <span className={`badge ${p.status === 'confirmed' ? 'badge-acknowledged' : p.status === 'claimed_paid' ? 'badge-pending' : 'badge-withdrawn'}`}>
                        {p.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {p.status === 'unpaid' && p.player_id === currentUserId && (
                        <button className="btn btn-outline btn-sm" onClick={() => claim(p.id)}>
                          I paid my share
                        </button>
                      )}
                      {p.status === 'claimed_paid' && s.paid_by === currentUserId && (
                        <button className="btn btn-primary btn-sm" onClick={() => confirm(p.id)}>
                          Confirm received
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  )
}
