import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import type { LedgerCategory } from './types'

// Global (team_id null) categories plus any this team added of its own.
export function useLedgerCategories(teamId: string | null) {
  const [categories, setCategories] = useState<LedgerCategory[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      let query = supabase.from('ledger_categories').select('id, key, label, kind, receipts_recommended')
      query = teamId ? query.or(`team_id.is.null,team_id.eq.${teamId}`) : query.is('team_id', null)
      const { data, error } = await query.order('label')
      if (cancelled) return
      if (error) console.error('Failed to load categories', error)
      setCategories(data ?? [])
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [teamId])

  return { categories, loading }
}
