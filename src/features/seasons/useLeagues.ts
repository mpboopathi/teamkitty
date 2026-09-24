import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import type { League } from './types'

export function useLeagues() {
  const [leagues, setLeagues] = useState<League[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase.from('leagues').select('id, name, sport, region').order('name')
    if (error) console.error('Failed to load leagues', error)
    setLeagues(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  async function addLeague(name: string, sport: string, region: string) {
    const { data, error } = await supabase
      .from('leagues')
      .insert({ name, sport: sport || null, region: region || null })
      .select('id, name, sport, region')
      .single()
    if (error) throw error
    await refresh()
    return data as League
  }

  return { leagues, loading, refresh, addLeague }
}
