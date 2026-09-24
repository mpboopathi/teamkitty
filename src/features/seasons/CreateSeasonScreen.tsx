import { useState } from 'react'
import type { FormEvent } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useLeagues } from './useLeagues'

interface Props {
  teamId: string
  priorClosingBalance: number | null
  onCreated: () => void
}

export function CreateSeasonScreen({ teamId, priorClosingBalance, onCreated }: Props) {
  const { leagues, addLeague } = useLeagues()

  const [name, setName] = useState('')
  const [leagueId, setLeagueId] = useState('')
  const [newLeagueName, setNewLeagueName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [registrationFee, setRegistrationFee] = useState('250')
  const [leagueFee, setLeagueFee] = useState('2000')
  const [plannedGames, setPlannedGames] = useState('10')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    try {
      let finalLeagueId = leagueId || null
      if (!finalLeagueId && newLeagueName.trim()) {
        const created = await addLeague(newLeagueName.trim(), 'cricket', '')
        finalLeagueId = created.id
      }

      const { error } = await supabase.rpc('create_season', {
        p_team_id: teamId,
        p_name: name.trim(),
        p_league_id: finalLeagueId,
        p_start_date: startDate || null,
        p_end_date: endDate || null,
        p_registration_fee_amount: Number(registrationFee) || 0,
        p_league_fee_amount: Number(leagueFee) || 0,
        p_planned_game_count: Number(plannedGames) || 0,
      })

      if (error) throw error
      onCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="card" style={{ maxWidth: 480 }}>
      <h2 className="section-title">🌱 Create a season</h2>
      {priorClosingBalance !== null && (
        <p className="hint">
          Opening balance will carry forward automatically from the prior season's closing
          balance: <strong>${priorClosingBalance.toFixed(2)}</strong>
        </p>
      )}
      <form onSubmit={handleSubmit} className="form-stack">
        <input required placeholder="Season name (e.g. 2026 Spring)" value={name} onChange={(e) => setName(e.target.value)} />

        <label>
          League
          <select value={leagueId} onChange={(e) => setLeagueId(e.target.value)}>
            <option value="">— select existing —</option>
            {leagues.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </label>
        {!leagueId && (
          <input
            placeholder="Or add a new league (e.g. SDCA)"
            value={newLeagueName}
            onChange={(e) => setNewLeagueName(e.target.value)}
          />
        )}

        <label>
          Start date
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </label>
        <label>
          End date
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </label>
        <label>
          Registration fee per player ($)
          <input type="number" value={registrationFee} onChange={(e) => setRegistrationFee(e.target.value)} />
        </label>
        <label>
          League fee ($)
          <input type="number" value={leagueFee} onChange={(e) => setLeagueFee(e.target.value)} />
        </label>
        <label>
          Planned games
          <input type="number" value={plannedGames} onChange={(e) => setPlannedGames(e.target.value)} />
        </label>

        <button type="submit" disabled={saving} className="btn btn-primary">
          {saving ? 'Creating…' : 'Create season'}
        </button>
        {error && <p className="error-text">{error}</p>}
      </form>
    </div>
  )
}
