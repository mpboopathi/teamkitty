import { useState } from 'react'
import type { FormEvent } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useTeamRoster } from './useTeamRoster'
import { OFFICER_ROLE_KEYS, OFFICER_ROLE_LABELS, rosterMemberName } from './types'
import type { Team } from './types'

interface Props {
  team: Team
  currentUserId: string
}

export function TeamRoster({ team, currentUserId }: Props) {
  const { members, officers, loading, refresh } = useTeamRoster(team.id)

  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState('')

  const isCurrentUserOfficer = officers.some((o) => o.user_id === currentUserId)
  const activeMembers = members.filter((m) => m.status !== 'inactive')
  const inactiveMembers = members.filter((m) => m.status === 'inactive')

  async function handleAddPlayer(e: FormEvent) {
    e.preventDefault()
    setAdding(true)
    setAddError('')

    const { error } = await supabase.rpc('add_team_member', {
      p_team_id: team.id,
      p_email: email.trim(),
      p_full_name: name.trim() || null,
    })

    if (error) {
      setAddError(error.message)
    } else {
      setEmail('')
      setName('')
      await refresh()
    }
    setAdding(false)
  }

  async function handleReassign(roleKey: string, newUserId: string) {
    if (!newUserId) return
    const { error } = await supabase.rpc('reassign_officer_role', {
      p_team_id: team.id,
      p_role_key: roleKey,
      p_new_user_id: newUserId,
    })
    if (error) {
      alert(error.message)
    } else {
      await refresh()
    }
  }

  async function handleRemove(memberId: string, memberName: string) {
    if (!window.confirm(`Remove ${memberName} from the active roster? Their history stays intact, and an officer can add them back later.`)) return
    const { error } = await supabase.rpc('deactivate_team_member', { p_member_id: memberId })
    if (error) alert(error.message)
    else await refresh()
  }

  async function handleReactivate(memberId: string) {
    const { error } = await supabase.rpc('reactivate_team_member', { p_member_id: memberId })
    if (error) alert(error.message)
    else await refresh()
  }

  if (loading) return <p className="muted">Loading roster…</p>

  return (
    <div>
      {isCurrentUserOfficer && (
        <div className="card-tinted">
          <p style={{ margin: 0 }}>
            🔑 Team join code: <span className="join-code">{team.join_code}</span>
          </p>
          <p className="hint" style={{ margin: '0.35rem 0 0' }}>
            Share this with new players — they'll enter it after signing in to join the team instantly, no need to add
            them here first.
          </p>
        </div>
      )}

      <h2 className="section-title">🎖️ Officers</h2>
      <div className="table-card">
        <table>
          <tbody>
            {OFFICER_ROLE_KEYS.map((roleKey) => {
              const holder = officers.find((o) => o.role_key === roleKey)
              return (
                <tr key={roleKey}>
                  <td style={{ fontWeight: 600 }}>{OFFICER_ROLE_LABELS[roleKey]}</td>
                  <td>{holder ? holder.profiles?.full_name ?? '(unnamed)' : <span className="muted">— vacant —</span>}</td>
                  <td>
                    {isCurrentUserOfficer && (
                      <select defaultValue="" onChange={(e) => handleReassign(roleKey, e.target.value)}>
                        <option value="" disabled>
                          Reassign to…
                        </option>
                        {members
                          .filter((m) => m.user_id && m.status !== 'inactive')
                          .map((m) => (
                            <option key={m.user_id} value={m.user_id!}>
                              {rosterMemberName(m)}
                            </option>
                          ))}
                      </select>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <h2 className="section-title">👥 Roster ({activeMembers.length})</h2>
      <div className="table-card">
        <table>
          <tbody>
            {activeMembers.map((m) => (
              <tr key={m.id}>
                <td>
                  {rosterMemberName(m)}
                  {m.status === 'invited' && <span className="badge badge-invited" style={{ marginLeft: '0.5rem' }}>invited</span>}
                </td>
                <td style={{ textAlign: 'right' }}>
                  {isCurrentUserOfficer && (
                    <button className="btn btn-outline btn-sm" onClick={() => handleRemove(m.id, rosterMemberName(m))}>
                      Remove
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isCurrentUserOfficer && inactiveMembers.length > 0 && (
        <>
          <h2 className="section-title">🗂️ Removed players ({inactiveMembers.length})</h2>
          <div className="table-card">
            <table>
              <tbody>
                {inactiveMembers.map((m) => (
                  <tr key={m.id}>
                    <td className="muted">{rosterMemberName(m)}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => handleReactivate(m.id)}>
                        ↩️ Add back
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {isCurrentUserOfficer && (
        <>
          <h2 className="section-title">➕ Add a player</h2>
          <div className="card">
            <form onSubmit={handleAddPlayer} className="form-stack" style={{ maxWidth: 420 }}>
              <label>
                Email
                <input type="email" required placeholder="player@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              </label>
              <label>
                Name (optional, until they sign in)
                <input value={name} onChange={(e) => setName(e.target.value)} />
              </label>
              <button type="submit" disabled={adding} className="btn btn-primary">
                {adding ? 'Adding…' : 'Add player'}
              </button>
              {addError && <p className="error-text">{addError}</p>}
            </form>
          </div>
        </>
      )}
    </div>
  )
}
