import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import type { PracticeSession } from './types'

const SELECT = `
  id, team_id, session_date, location, hourly_rate, hours_booked, total_cost, paid_by, notes,
  payer:profiles!practice_sessions_paid_by_fkey(full_name),
  practice_participants(
    id, player_id, share_amount, status,
    player:profiles!practice_participants_player_id_fkey(full_name)
  )
`

export function usePracticeSessions(teamId: string | null) {
  const [sessions, setSessions] = useState<PracticeSession[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!teamId) {
      setSessions([])
      setLoading(false)
      return
    }
    setLoading(true)
    const { data, error } = await supabase
      .from('practice_sessions')
      .select(SELECT)
      .eq('team_id', teamId)
      .order('session_date', { ascending: false })
    if (error) console.error('Failed to load practice sessions', error)
    setSessions((data as unknown as PracticeSession[]) ?? [])
    setLoading(false)
  }, [teamId])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { sessions, loading, refresh }
}
