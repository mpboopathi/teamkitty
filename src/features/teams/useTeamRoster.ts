import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import type { OfficerRoleRow, RosterMember } from './types'

export function useTeamRoster(teamId: string | null) {
  const [members, setMembers] = useState<RosterMember[]>([])
  const [officers, setOfficers] = useState<OfficerRoleRow[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!teamId) {
      setMembers([])
      setOfficers([])
      setLoading(false)
      return
    }

    setLoading(true)

    const [membersResult, officersResult] = await Promise.all([
      supabase
        .from('team_members')
        .select('id, user_id, invite_email, display_name, status, profiles(full_name, email)')
        .eq('team_id', teamId)
        .order('joined_at', { ascending: true }),
      supabase
        .from('team_officer_roles')
        .select('id, role_key, user_id, profiles(full_name, email)')
        .eq('team_id', teamId)
        .is('end_date', null),
    ])

    if (membersResult.error) console.error('Failed to load roster', membersResult.error)
    if (officersResult.error) console.error('Failed to load officer roles', officersResult.error)

    setMembers((membersResult.data as unknown as RosterMember[]) ?? [])
    setOfficers((officersResult.data as unknown as OfficerRoleRow[]) ?? [])
    setLoading(false)
  }, [teamId])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { members, officers, loading, refresh }
}
