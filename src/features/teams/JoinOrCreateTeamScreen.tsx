import { useState } from 'react'
import type { FormEvent } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { AccountActions } from '../auth/AccountActions'
import { CreateTeamScreen } from './CreateTeamScreen'

interface Props {
  onJoined: () => void
  onCreated: () => void
  onSignedOut: () => void
}

export function JoinOrCreateTeamScreen({ onJoined, onCreated, onSignedOut }: Props) {
  const [mode, setMode] = useState<'join' | 'create'>('join')
  const [code, setCode] = useState('')
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState('')

  async function handleJoin(e: FormEvent) {
    e.preventDefault()
    setJoining(true)
    setError('')

    const { error } = await supabase.rpc('join_team_by_code', { p_code: code.trim() })

    if (error) {
      setError(error.message)
      setJoining(false)
    } else {
      onJoined()
    }
  }

  return (
    <div className="center-shell">
      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <img src="/favicon.svg" alt="" width="56" height="56" style={{ borderRadius: '14px' }} />
        <h1 style={{ fontSize: '1.8rem', marginTop: '0.6rem' }}>Welcome to TeamKitty</h1>
      </div>

      <div className="card">
        <div className="sub-tab-row">
          <button className={`sub-tab-btn ${mode === 'join' ? 'active' : ''}`} onClick={() => setMode('join')}>
            Join a team
          </button>
          <button className={`sub-tab-btn ${mode === 'create' ? 'active' : ''}`} onClick={() => setMode('create')}>
            Create a new team
          </button>
        </div>

        {mode === 'join' ? (
          <form onSubmit={handleJoin} className="form-stack">
            <p className="hint" style={{ marginTop: 0 }}>
              Ask your team's treasurer, captain, or another officer for the team's join code.
            </p>
            <input
              placeholder="e.g. K7QX2P"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              style={{ letterSpacing: '0.2em', textTransform: 'uppercase', textAlign: 'center', fontWeight: 700 }}
              maxLength={6}
            />
            <button type="submit" disabled={joining || !code.trim()} className="btn btn-primary">
              {joining ? 'Joining…' : '🎉 Join team'}
            </button>
            {error && <p className="error-text">{error}</p>}
          </form>
        ) : (
          <CreateTeamScreen onCreated={onCreated} />
        )}
      </div>

      <div style={{ marginTop: '1.25rem' }}>
        <AccountActions onSignedOut={onSignedOut} />
      </div>
    </div>
  )
}
