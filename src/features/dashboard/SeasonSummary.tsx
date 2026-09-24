import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import type { Season } from '../seasons/types'

interface PlayerSummaryRow {
  player_id: string
  full_name: string
  registration_paid: number
  games_played: number
  suggested_return: number
  returned_so_far: number
}

interface Props {
  season: Season
  refreshKey: number
}

export function SeasonSummary({ season, refreshKey }: Props) {
  const [balance, setBalance] = useState<number | null>(null)
  const [rows, setRows] = useState<PlayerSummaryRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const [balanceRes, summaryRes] = await Promise.all([
        supabase.rpc('season_closing_balance', { p_season_id: season.id }),
        supabase.rpc('season_player_summary', { p_season_id: season.id }),
      ])
      if (cancelled) return
      if (balanceRes.error) console.error(balanceRes.error)
      if (summaryRes.error) console.error(summaryRes.error)
      setBalance(typeof balanceRes.data === 'number' ? balanceRes.data : null)
      setRows((summaryRes.data as PlayerSummaryRow[]) ?? [])
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [season.id, refreshKey])

  if (loading) return <p className="muted">Loading summary…</p>

  const totalRegistered = rows.reduce((sum, r) => sum + r.registration_paid, 0)
  const totalReturned = rows.reduce((sum, r) => sum + r.returned_so_far, 0)

  return (
    <div>
      <div className="stat-row">
        <div className="stat-tile" style={{ background: 'linear-gradient(135deg, #ede9fe, #ffffff)' }}>
          <div className="stat-label">💰 Current balance</div>
          <div className="stat-value">${balance?.toFixed(2) ?? '—'}</div>
          <div className="hint">opening ${season.opening_balance.toFixed(2)} + acknowledged transactions</div>
        </div>
        <div className="stat-tile" style={{ background: 'linear-gradient(135deg, #ccfbf6, #ffffff)' }}>
          <div className="stat-label">🧾 Registrations collected</div>
          <div className="stat-value" style={{ color: '#0f766e' }}>
            ${totalRegistered.toFixed(2)}
          </div>
        </div>
        <div className="stat-tile" style={{ background: 'linear-gradient(135deg, #fef3c7, #ffffff)' }}>
          <div className="stat-label">↩️ Returned so far</div>
          <div className="stat-value" style={{ color: '#b45309' }}>
            ${totalReturned.toFixed(2)}
          </div>
        </div>
      </div>

      {season.per_game_cost == null && (
        <div className="card-tinted" style={{ background: 'var(--warning-bg)', border: '1px solid #fde68a', color: 'var(--warning)' }}>
          Set a "cost per game played" in season settings to see suggested fee-return amounts below.
        </div>
      )}

      <div className="table-card">
        <table cellPadding={0}>
          <thead>
            <tr>
              <th>Player</th>
              <th>Registration paid</th>
              <th>Games played</th>
              <th>Suggested return</th>
              <th>Returned so far</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.player_id}>
                <td>{r.full_name}</td>
                <td>${r.registration_paid.toFixed(2)}</td>
                <td>{r.games_played}</td>
                <td>${r.suggested_return.toFixed(2)}</td>
                <td>${r.returned_so_far.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
