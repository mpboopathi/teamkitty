import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import type { Game } from './types'

export function useGames(seasonId: string | null) {
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!seasonId) {
      setGames([])
      setLoading(false)
      return
    }
    setLoading(true)
    const { data, error } = await supabase
      .from('games')
      .select('*')
      .eq('season_id', seasonId)
      .order('game_number', { ascending: true, nullsFirst: false })
    if (error) console.error('Failed to load games', error)
    setGames(data ?? [])
    setLoading(false)
  }, [seasonId])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { games, loading, refresh }
}
