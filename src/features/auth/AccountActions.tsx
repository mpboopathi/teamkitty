import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

// Sign out + delete account, rendered on every screen a signed-in user can
// land on -- including before they've joined or created a team -- so
// account deletion is always reachable, not just from inside a team.
// Apple requires apps that support account creation to also support
// in-app account deletion (Guideline 5.1.1(v)).

interface Props {
  onSignedOut: () => void
}

export function AccountActions({ onSignedOut }: Props) {
  const [deleting, setDeleting] = useState(false)

  async function handleDeleteAccount() {
    const confirmed = window.confirm(
      'Delete your TeamKitty account? This removes your name, email, and login permanently, and takes you off ' +
        'every team roster. Ledger entries you were involved in stay in your teams\' shared records (shown as ' +
        '"deleted user"), since other teammates rely on that history. This cannot be undone.'
    )
    if (!confirmed) return

    setDeleting(true)
    const { error } = await supabase.rpc('delete_my_account')
    if (error) {
      setDeleting(false)
      alert(error.message)
      return
    }
    await supabase.auth.signOut()
    onSignedOut()
    setDeleting(false)
  }

  return (
    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
      <button
        className="btn btn-outline btn-sm"
        onClick={() => {
          supabase.auth.signOut()
          onSignedOut()
        }}
      >
        Sign out
      </button>
      <button className="btn btn-outline btn-sm" disabled={deleting} onClick={handleDeleteAccount}>
        {deleting ? 'Deleting…' : '🗑️ Delete account'}
      </button>
    </div>
  )
}
