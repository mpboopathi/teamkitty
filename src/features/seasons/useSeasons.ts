import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import type { Season } from './types'

export function useSeasons(teamId: string | null) {
  const [seasons, setSeasons] = useState<Season[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!teamId) {
      setSeasons([])
      setLoading(false)
      return
    }
    setLoading(true)
    const { data, error } = await supabase
      .from('seasons')
      .select('*')
      .eq('team_id', teamId)
      .order('created_at', { ascending: false })
    if (error) console.error('Failed to load seasons', error)
    setSeasons(data ?? [])
    setLoading(false)
  }, [teamId])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { seasons, loading, refresh }
}
