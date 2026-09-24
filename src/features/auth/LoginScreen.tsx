import { useState } from 'react'
import type { FormEvent } from 'react'
import { supabase } from '../../lib/supabaseClient'

interface Props {
  onBack?: () => void
}

export function LoginScreen({ onBack }: Props) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState<'idle' | 'working' | 'confirm' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  function switchMode(next: 'signin' | 'signup') {
    setMode(next)
    setStatus('idle')
    setErrorMessage('')
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setStatus('working')
    setErrorMessage('')

    if (mode === 'signup') {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      })

      if (error) {
        setStatus('error')
        setErrorMessage(error.message)
      } else if (!data.session) {
        setStatus('confirm')
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (error) {
        setStatus('error')
        setErrorMessage(error.message)
      }
    }
  }

  if (status === 'confirm') {
    return (
      <div className="center-shell">
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2.2rem' }}>📬</div>
          <h1>Check your email</h1>
          <p className="muted">
            We sent a confirmation link to <strong>{email}</strong>. Click it, then come back here
            and sign in with that email and the password you just chose.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="center-shell">
      {onBack && (
        <button className="btn btn-outline btn-sm" onClick={onBack} style={{ marginBottom: '1rem' }}>
          ← Back
        </button>
      )}
      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <img src="/favicon.svg" alt="" width="56" height="56" style={{ borderRadius: '14px' }} />
        <h1 style={{ fontSize: '1.8rem', marginTop: '0.6rem' }}>TeamKitty</h1>
        <p className="muted">Team funds, made simple.</p>
      </div>

      <div className="card">
        <div className="sub-tab-row">
          <button className={`sub-tab-btn ${mode === 'signin' ? 'active' : ''}`} onClick={() => switchMode('signin')}>
            Sign in
          </button>
          <button className={`sub-tab-btn ${mode === 'signup' ? 'active' : ''}`} onClick={() => switchMode('signup')}>
            Create account
          </button>
        </div>

        <p className="hint" style={{ marginTop: 0 }}>
          {mode === 'signin'
            ? 'Sign in with your email and password.'
            : "Pick a password — you'll use it to sign in from now on."}
        </p>

        <form onSubmit={handleSubmit} className="form-stack">
          <input
            type="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            required
            minLength={6}
            placeholder={mode === 'signup' ? 'Choose a password (min 6 characters)' : 'Password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button type="submit" disabled={status === 'working'} className="btn btn-primary">
            {status === 'working' ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Sign in'}
          </button>
          {status === 'error' && <p className="error-text">{errorMessage}</p>}
        </form>
      </div>
    </div>
  )
}
