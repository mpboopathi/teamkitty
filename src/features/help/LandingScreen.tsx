import { HelpScreen } from './HelpScreen'

interface Props {
  onGetStarted: () => void
}

// The very first thing a brand-new visitor sees, before any sign-in --
// same content as the in-app "How it works" tab, so nobody needs a
// walkthrough call before they understand what they're joining.
export function LandingScreen({ onGetStarted }: Props) {
  return (
    <main className="page-shell">
      <header className="app-header">
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <img src="/favicon.svg" alt="" width="30" height="30" style={{ borderRadius: '8px' }} />
          TeamKitty
        </h1>
        <button className="btn btn-secondary btn-sm" onClick={onGetStarted}>
          Sign in / Sign up →
        </button>
      </header>

      <div className="card-tinted" style={{ textAlign: 'center' }}>
        <p style={{ margin: 0 }}>
          👋 New here? Here's how TeamKitty works — sign in or create an account whenever you're ready.
        </p>
      </div>

      <HelpScreen />

      <div style={{ textAlign: 'center', margin: '0.5rem 0 1.5rem' }}>
        <button className="btn btn-primary" onClick={onGetStarted}>
          Sign in / Sign up →
        </button>
      </div>
    </main>
  )
}
