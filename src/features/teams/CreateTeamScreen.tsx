import { useState } from 'react'
import type { FormEvent } from 'react'
import { supabase } from '../../lib/supabaseClient'

interface Props {
  onCreated: () => void
}

export function CreateTeamScreen({ onCreated }: Props) {
  const [name, setName] = useState('')
  const [sport, setSport] = useState('cricket')
  const [city, setCity] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    const { error } = await supabase.rpc('create_team', {
      p_name: name.trim(),
      p_sport: sport.trim() || 'cricket',
      p_city: city.trim() || null,
    })

    if (error) {
      setError(error.message)
      setSaving(false)
      return
    }

    onCreated()
  }

  return (
    <div>
      <p className="hint" style={{ marginTop: 0 }}>
        You'll start out holding every officer role (treasurer, captain, vice captain, board
        member) — hand specific ones off to teammates once the roster is set up.
      </p>
      <form onSubmit={handleSubmit} className="form-stack">
        <input required placeholder="Team name (e.g. SDKings)" value={name} onChange={(e) => setName(e.target.value)} />
        <input placeholder="Sport" value={sport} onChange={(e) => setSport(e.target.value)} />
        <input placeholder="City (optional)" value={city} onChange={(e) => setCity(e.target.value)} />
        <button type="submit" disabled={saving} className="btn btn-primary">
          {saving ? 'Creating…' : 'Create team'}
        </button>
        {error && <p className="error-text">{error}</p>}
      </form>
    </div>
  )
}
