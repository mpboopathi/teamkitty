import { supabase } from '../../lib/supabaseClient'
import type { LedgerEntry } from './types'
import { viewReceipt } from './receipts'

interface Props {
  entries: LedgerEntry[]
  currentUserId: string
  onChanged: () => void
}

const statusBadgeClass: Record<LedgerEntry['status'], string> = {
  pending: 'badge-pending',
  acknowledged: 'badge-acknowledged',
  rejected: 'badge-rejected',
  withdrawn: 'badge-withdrawn',
  voided: 'badge-voided',
}

export function LedgerHistory({ entries, currentUserId, onChanged }: Props) {
  if (entries.length === 0) return <p className="muted">No transactions yet.</p>

  async function withdraw(id: string) {
    if (!window.confirm('Withdraw this pending entry? It never affected the balance, so this just cancels it.')) return
    const { error } = await supabase.rpc('withdraw_ledger_entry', { p_entry_id: id })
    if (error) alert(error.message)
    else onChanged()
  }

  async function voidEntry(id: string) {
    const reason = window.prompt('Reason for voiding this already-acknowledged entry:') ?? undefined
    if (reason === undefined) return
    const { error } = await supabase.rpc('void_ledger_entry', { p_entry_id: id, p_reason: reason || null })
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
            <th>Who</th>
            <th>Note</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr key={e.id}>
              <td>{e.occurred_on}</td>
              <td>{e.ledger_categories?.label}</td>
              <td style={{ fontWeight: 700, color: e.ledger_categories?.kind === 'income' ? 'var(--success)' : 'var(--danger)' }}>
                {e.ledger_categories?.kind === 'income' ? '+' : '-'}${e.amount.toFixed(2)}
              </td>
              <td>{e.player?.full_name ?? e.payee_name ?? '—'}</td>
              <td>
                {e.note ?? ''}
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
              <td>
                <span className={`badge ${statusBadgeClass[e.status]}`}>{e.status}</span>
                {e.status === 'voided' && e.void_reason ? <div className="hint">{e.void_reason}</div> : null}
              </td>
              <td style={{ whiteSpace: 'nowrap' }}>
                {e.status === 'pending' && e.created_by === currentUserId && (
                  <button className="btn btn-outline btn-sm" onClick={() => withdraw(e.id)}>
                    Withdraw
                  </button>
                )}
                {e.status === 'acknowledged' && e.created_by !== currentUserId && (
                  <button className="btn btn-danger btn-sm" onClick={() => voidEntry(e.id)}>
                    Void
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
