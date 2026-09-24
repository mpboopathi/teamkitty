import { supabase } from '../../lib/supabaseClient'
import type { Team } from './types'

// Public bucket, so this is just a plain URL -- no signed-URL dance needed
// (unlike receipts, which are private).
export function teamLogoUrl(team: Pick<Team, 'logo_path'>): string | null {
  if (!team.logo_path) return null
  return supabase.storage.from('team-logos').getPublicUrl(team.logo_path).data.publicUrl
}

export async function uploadTeamLogo(teamId: string, file: File): Promise<Team> {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'png'
  const path = `${teamId}/logo.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('team-logos')
    .upload(path, file, { upsert: true, cacheControl: '3600' })
  if (uploadError) throw uploadError

  const { data, error } = await supabase.rpc('update_team_logo', {
    p_team_id: teamId,
    p_logo_path: path,
  })
  if (error) throw error
  return data as Team
}
