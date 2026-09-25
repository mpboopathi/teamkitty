import { useState } from 'react'
import type { FormEvent } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabaseClient'
import { AccountActions } from './AccountActions'

interface Props {
  session: Session
  onDone: () => void
  onSignedOut: () => void
}

export function CompleteProfileScreen({ session, onDone, onSignedOut }: Props) {
  const [fullName, setFullName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    const { error } = await supabase.from('profiles').insert({
      id: session.user.id,
      full_name: fullName.trim(),
      email: session.user.email,
    })

    if (error) {
      // A profile for this account can already exist even though this
      // screen showed up -- e.g. right after sign-in, this screen can
      // briefly render before the session is fully recognized elsewhere.
      // Treat "already have one" as success instead of a scary DB error.
      if (error.code === '23505') {
        onDone()
        return
      }
      setError(error.message)
      setSaving(false)
      return
    }

    onDone()
  }

  return (
    <div className="center-shell">
      <div className="card">
        <div style={{ textAlign: 'center', marginBottom: '0.5rem', fontSize: '2.2rem' }}>👋</div>
        <h1 style={{ textAlign: 'center' }}>One last step</h1>
        <p className="hint" style={{ textAlign: 'center' }}>
          Your account's set up. Just tell us what name your teammates should see you as.
        </p>
        <form onSubmit={handleSubmit} className="form-stack">
          <input required placeholder="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          <button type="submit" disabled={saving} className="btn btn-primary">
            {saving ? 'Saving…' : 'Continue'}
          </button>
          {error && <p className="error-text">{error}</p>}
        </form>
      </div>

      <div style={{ marginTop: '1.25rem' }}>
        <AccountActions onSignedOut={onSignedOut} />
      </div>
    </div>
  )
}
