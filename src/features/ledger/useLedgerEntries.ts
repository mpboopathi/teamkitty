import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import type { LedgerEntry } from './types'

const SELECT = `
  id, season_id, category_id, amount, player_id, game_id, payee_name, note,
  occurred_on, status, created_by, acknowledged_by, acknowledged_at,
  voided_by, voided_at, void_reason, created_at,
  ledger_categories(id, key, label, kind, receipts_recommended),
  creator:profiles!ledger_entries_created_by_fkey(full_name),
  player:profiles!ledger_entries_player_id_fkey(full_name)
`

export function useLedgerEntries(seasonId: string | null) {
  const [entries, setEntries] = useState<LedgerEntry[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!seasonId) {
      setEntries([])
      setLoading(false)
      return
    }
    setLoading(true)
    const { data, error } = await supabase
      .from('ledger_entries')
      .select(SELECT)
      .eq('season_id', seasonId)
      .order('occurred_on', { ascending: false })

    if (error) console.error('Failed to load ledger entries', error)
    const loaded = (data as unknown as LedgerEntry[]) ?? []

    let attachmentsByEntry: Record<string, LedgerEntry['attachments']> = {}
    if (loaded.length > 0) {
      const { data: attachmentRows, error: attachError } = await supabase
        .from('attachments')
        .select('id, entity_id, storage_path, file_name')
        .eq('entity_type', 'ledger_entry')
        .in(
          'entity_id',
          loaded.map((e) => e.id),
        )
      if (attachError) console.error('Failed to load receipt attachments', attachError)
      attachmentsByEntry = (attachmentRows ?? []).reduce<Record<string, LedgerEntry['attachments']>>((acc, row) => {
        const key = row.entity_id as string
        if (!acc[key]) acc[key] = []
        acc[key].push({ id: row.id, storage_path: row.storage_path, file_name: row.file_name })
        return acc
      }, {})
    }

    setEntries(loaded.map((e) => ({ ...e, attachments: attachmentsByEntry[e.id] ?? [] })))
    setLoading(false)
  }, [seasonId])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { entries, loading, refresh }
}
