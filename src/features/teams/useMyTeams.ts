import { useCallback, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabaseClient'
import type { Team } from './types'

export function useMyTeams(session: Session | null) {
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!session) {
      setTeams([])
      setLoading(false)
      return
    }

    setLoading(true)
    const { data, error } = await supabase
      .from('team_members')
      .select('teams(*)')
      .eq('user_id', session.user.id)

    if (error) {
      console.error('Failed to load teams', error)
      setTeams([])
    } else {
      // Each row's `teams` is the joined team record. Cast needed because
      // supabase-js can't infer embed cardinality without generated types.
      const rows = (data ?? []) as unknown as { teams: Team | null }[]
      setTeams(rows.map((row) => row.teams).filter((t): t is Team => t !== null))
    }
    setLoading(false)
  }, [session])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { teams, loading, refresh }
}
