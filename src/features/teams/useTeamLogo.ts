import { useCallback, useEffect, useState } from 'react'
import { fetchTeamLogoDataUrl } from './teamLogo'

export function useTeamLogo(teamId: string | null) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!teamId) {
      setLogoUrl(null)
      return
    }
    try {
      setLogoUrl(await fetchTeamLogoDataUrl(teamId))
    } catch {
      // Non-fatal -- just fall back to the default mark.
      setLogoUrl(null)
    }
  }, [teamId])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { logoUrl, refresh }
}
