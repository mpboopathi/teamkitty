import { useState } from 'react'
import type { FormEvent } from 'react'
import { supabase } from '../../lib/supabaseClient'
import type { Season } from './types'

interface Props {
  season: Season
  onDone: () => void
  onCancel: () => void
}

export function EditSeasonSettingsForm({ season, onDone, onCancel }: Props) {
  const [perGameCost, setPerGameCost] = useState(season.per_game_cost != null ? String(season.per_game_cost) : '')
  const [registrationFee, setRegistrationFee] = useState(String(season.registration_fee_amount))
  const [leagueFee, setLeagueFee] = useState(String(season.league_fee_amount))
  const [plannedGames, setPlannedGames] = useState(String(season.planned_game_count))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    const { error } = await supabase.rpc('update_season_settings', {
      p_season_id: season.id,
      p_per_game_cost: perGameCost.trim() ? Number(perGameCost) : null,
      p_registration_fee_amount: registrationFee.trim() ? Number(registrationFee) : null,
      p_league_fee_amount: leagueFee.trim() ? Number(leagueFee) : null,
      p_planned_game_count: plannedGames.trim() ? Number(plannedGames) : null,
    })

    setSaving(false)
    if (error) {
      setError(error.message)
      return
    }
    onDone()
  }

  return (
    <div className="card" style={{ maxWidth: 480 }}>
      <h2 className="section-title" style={{ marginTop: 0 }}>
        ⚙️ Edit "{season.name}" settings
      </h2>
      <p className="hint" style={{ marginTop: 0 }}>
        Changes apply immediately and recalculate suggested fee-returns for this season.
      </p>
      <form onSubmit={handleSubmit} className="form-stack">
        <label>
          Cost per game played ($)
          <input
            type="number"
            step="0.01"
            min="0"
            placeholder="e.g. 25"
            value={perGameCost}
            onChange={(e) => setPerGameCost(e.target.value)}
          />
        </label>
        <label>
          Registration fee per player ($)
          <input type="number" step="0.01" min="0" value={registrationFee} onChange={(e) => setRegistrationFee(e.target.value)} />
        </label>
        <label>
          League fee ($)
          <input type="number" step="0.01" min="0" value={leagueFee} onChange={(e) => setLeagueFee(e.target.value)} />
        </label>
        <label>
          Planned games
          <input type="number" min="0" value={plannedGames} onChange={(e) => setPlannedGames(e.target.value)} />
        </label>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button type="submit" disabled={saving} className="btn btn-primary">
            {saving ? 'Saving…' : 'Save changes'}
          </button>
          <button type="button" className="btn btn-outline" onClick={onCancel}>
            Cancel
          </button>
        </div>
        {error && <p className="error-text">{error}</p>}
      </form>
    </div>
  )
}
