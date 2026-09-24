import { useCallback, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabaseClient'

export interface Profile {
  id: string
  full_name: string
  email: string | null
  phone: string | null
}

// A session existing just means "this email verified a magic link" --
// it does NOT mean a profiles row exists yet. First-time sign-ins need
// to be routed through CompleteProfileScreen to create one.
export function useProfile(session: Session | null) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!session) {
      setProfile(null)
      setLoading(false)
      return
    }

    setLoading(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, phone')
      .eq('id', session.user.id)
      .maybeSingle()

    if (error) {
      console.error('Failed to load profile', error)
    }
    setProfile(data ?? null)
    setLoading(false)
  }, [session])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { profile, loading, refresh }
}
