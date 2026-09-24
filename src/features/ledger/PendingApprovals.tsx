import { supabase } from '../../lib/supabaseClient'
import type { LedgerEntry } from './types'
import type { OfficerRoleRow } from '../teams/types'
import { OFFICER_ROLE_LABELS } from '../teams/types'
import { viewReceipt } from './receipts'

interface Props {
  entries: LedgerEntry[]
  currentUserId: string
  officers: OfficerRoleRow[]
  onChanged: () => void
}

// Mirrors the server-side maker-checker rule in acknowledge_ledger_entry:
// a treasurer's own submissions need a captain to sign off, and everyone
// else's submissions need the treasurer to sign off.
function requiredApproverRole(creatorId: string, officers: OfficerRoleRow[]): 'treasurer' | 'captain' {
  const creatorIsTreasurer = officers.some((o) => o.user_id === creatorId && o.role_key === 'treasurer')
  return creatorIsTreasurer ? 'captain' : 'treasurer'
}

// Shows entries the current user is plausibly allowed to act on: they
// didn't create it (self-acknowledgement is blocked server-side anyway),
// and only officers actually eligible to sign off (per the same rule the
// server enforces) get the Acknowledge/Reject buttons -- everyone else
// sees it as a read-only "waiting on ___" line.
export function PendingApprovals({ entries, currentUserId, officers, onChanged }: Props) {
  const pending = entries.filter((e) => e.status === 'pending' && e.created_by !== currentUserId)

  if (pending.length === 0) return <p className="muted">✅ No entries waiting on your approval.</p>

  async function acknowledge(id: string) {
    const { error } = await supabase.rpc('acknowledge_ledger_entry', { p_entry_id: id })
    if (error) alert(error.message)
    else onChanged()
  }

  async function reject(id: string) {
    const reason = window.prompt('Reason for rejecting (optional):') ?? undefined
    const { error } = await supabase.rpc('reject_ledger_entry', { p_entry_id: id, p_reason: reason || null })
    if (error) alert(error.message)
    else onChanged()
  }

  return (
    <div className="table-card">
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Category</th>
            <th>Amount</th>
            <th>Submitted by</th>
            <th>Note</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {pending.map((e) => {
            const requiredRole = requiredApproverRole(e.created_by, officers)
            const canAct = officers.some((o) => o.user_id === currentUserId && o.role_key === requiredRole)

            return (
              <tr key={e.id}>
                <td>{e.occurred_on}</td>
                <td>{e.ledger_categories?.label}</td>
                <td style={{ fontWeight: 700, color: e.ledger_categories?.kind === 'income' ? 'var(--success)' : 'var(--danger)' }}>
                  {e.ledger_categories?.kind === 'income' ? '+' : '-'}${e.amount.toFixed(2)}
                </td>
                <td>{e.creator?.full_name ?? '—'}</td>
                <td>
                  {e.note ?? (e.player ? `for ${e.player.full_name}` : e.payee_name)}
                  {e.attachments.length > 0 && (
                    <div>
                      {e.attachments.map((a) => (
                        <button
                          key={a.id}
                          type="button"
                          className="btn btn-outline btn-sm"
                          style={{ marginTop: '0.3rem' }}
                          onClick={() => viewReceipt(a.storage_path)}
                        >
                          📎 {a.file_name ?? 'Receipt'}
                        </button>
                      ))}
                    </div>
                  )}
                </td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  {canAct ? (
                    <>
                      <button className="btn btn-primary btn-sm" onClick={() => acknowledge(e.id)}>
                        ✅ Acknowledge
                      </button>{' '}
                      <button className="btn btn-outline btn-sm" onClick={() => reject(e.id)}>
                        ✖️ Reject
                      </button>
                    </>
                  ) : (
                    <span className="muted">Waiting on {OFFICER_ROLE_LABELS[requiredRole]}</span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
