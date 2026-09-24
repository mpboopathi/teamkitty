import { useState } from 'react'
import type { FormEvent } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useLedgerCategories } from './useLedgerCategories'
import type { RosterMember } from '../teams/types'
import { rosterMemberName } from '../teams/types'

interface Props {
  seasonId: string
  teamId: string
  roster: RosterMember[]
  isOfficer: boolean
  onSubmitted: () => void
}

// Categories where the amount is naturally tied to a specific player
// (their registration payment, or their fee return).
const PLAYER_CATEGORY_KEYS = new Set(['registration_fee', 'fee_return'])

// Officer-only categories -- players kept mixing up "League Fee" (a lump
// sum the treasurer pays the league) with their own registration fee, so
// it's hidden from the dropdown for anyone who isn't an officer. Still
// fully visible in ledger history for everyone; this only affects what
// shows up as a choice when submitting a new entry.
const OFFICER_ONLY_CATEGORY_KEYS = new Set(['league_fee'])

export function SubmitLedgerEntryForm({ seasonId, teamId, roster, isOfficer, onSubmitted }: Props) {
  const { categories: allCategories, loading: categoriesLoading } = useLedgerCategories(teamId)
  const categories = isOfficer ? allCategories : allCategories.filter((c) => !OFFICER_ONLY_CATEGORY_KEYS.has(c.key))

  const [categoryKey, setCategoryKey] = useState('')
  const [amount, setAmount] = useState('')
  const [playerId, setPlayerId] = useState('')
  const [payeeName, setPayeeName] = useState('')
  const [note, setNote] = useState('')
  const [occurredOn, setOccurredOn] = useState(() => new Date().toISOString().slice(0, 10))
  const [receipt, setReceipt] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const selectedCategory = categories.find((c) => c.key === categoryKey)
  const needsPlayer = categoryKey ? PLAYER_CATEGORY_KEYS.has(categoryKey) : false

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    try {
      const { data: entry, error: rpcError } = await supabase.rpc('submit_ledger_entry', {
        p_season_id: seasonId,
        p_category_key: categoryKey,
        p_amount: Number(amount),
        p_player_id: playerId || null,
        p_payee_name: payeeName.trim() || null,
        p_note: note.trim() || null,
        p_occurred_on: occurredOn,
      })

      if (rpcError) throw rpcError

      if (receipt && entry) {
        const path = `${teamId}/${entry.id}/${receipt.name}`
        const { error: uploadError } = await supabase.storage.from('receipts').upload(path, receipt)
        if (uploadError) throw uploadError

        const { error: attachError } = await supabase.from('attachments').insert({
          entity_type: 'ledger_entry',
          entity_id: entry.id,
          storage_path: path,
          file_name: receipt.name,
          uploaded_by: (await supabase.auth.getUser()).data.user?.id,
        })
        if (attachError) throw attachError
      }

      setCategoryKey('')
      setAmount('')
      setPlayerId('')
      setPayeeName('')
      setNote('')
      setReceipt(null)
      onSubmitted()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="form-stack" style={{ maxWidth: 420 }}>
      <label>
        Category
        <select required value={categoryKey} onChange={(e) => setCategoryKey(e.target.value)} disabled={categoriesLoading}>
          <option value="">— select —</option>
          {categories.map((c) => (
            <option key={c.id} value={c.key}>
              {c.kind === 'income' ? '💵' : '📤'} {c.label}
            </option>
          ))}
        </select>
      </label>

      <label>
        Amount ($)
        <input required type="number" step="0.01" min="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
      </label>

      {needsPlayer && (
        <label>
          Player
          <select required value={playerId} onChange={(e) => setPlayerId(e.target.value)}>
            <option value="">— select player —</option>
            {roster
              .filter((m) => m.user_id && m.status !== 'inactive')
              .map((m) => (
                <option key={m.user_id} value={m.user_id!}>
                  {rosterMemberName(m)}
                </option>
              ))}
          </select>
        </label>
      )}

      {!needsPlayer && categoryKey && (
        <label>
          Payee (e.g. umpire name, optional)
          <input value={payeeName} onChange={(e) => setPayeeName(e.target.value)} />
        </label>
      )}

      <label>
        Date
        <input type="date" value={occurredOn} onChange={(e) => setOccurredOn(e.target.value)} />
      </label>

      <label>
        Note
        <input value={note} onChange={(e) => setNote(e.target.value)} />
      </label>

      <label>
        Receipt photo {selectedCategory?.receipts_recommended ? '(recommended)' : '(optional)'}
        <input type="file" accept="image/*,application/pdf" onChange={(e) => setReceipt(e.target.files?.[0] ?? null)} />
      </label>

      <button type="submit" disabled={saving || !categoryKey} className="btn btn-primary">
        {saving ? 'Submitting…' : 'Submit for approval'}
      </button>
      {error && <p className="error-text">{error}</p>}
    </form>
  )
}
