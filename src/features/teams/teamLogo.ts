import { supabase } from '../../lib/supabaseClient'

// Team logos live in public.team_logos (base64 in a plain Postgres table),
// not Supabase Storage -- see git history for why. Access goes through
// SECURITY DEFINER RPCs, same as every other write/read in this app.

export async function fetchTeamLogoDataUrl(teamId: string): Promise<string | null> {
  const { data, error } = await supabase.rpc('get_team_logo', { p_team_id: teamId })
  if (error) throw error
  const row = Array.isArray(data) ? data[0] : data
  if (!row) return null
  return `data:${row.content_type};base64,${row.image_base64}`
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      // result is "data:<mime>;base64,<data>" -- strip the prefix.
      const commaIndex = result.indexOf(',')
      resolve(commaIndex >= 0 ? result.slice(commaIndex + 1) : result)
    }
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}

export async function uploadTeamLogo(teamId: string, file: File): Promise<void> {
  const base64 = await fileToBase64(file)
  const { error } = await supabase.rpc('upload_team_logo', {
    p_team_id: teamId,
    p_content_type: file.type || 'image/png',
    p_image_base64: base64,
  })
  if (error) throw error
}
