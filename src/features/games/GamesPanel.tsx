import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useGames } from './useGames'
import type { Game } from './types'
import type { RosterMember } from '../teams/types'
import { rosterMemberName } from '../teams/types'

interface Props {
  seasonId: string
  roster: RosterMember[]
  isOfficer: boolean
}

export function GamesPanel({ seasonId, roster, isOfficer }: Props) {
  const { games, loading, refresh } = useGames(seasonId)
  const [expandedGameId, setExpandedGameId] = useState<string | null>(null)
  const [editingGameId, setEditingGameId] = useState<string | null>(null)

  const [opponent, setOpponent] = useState('')
  const [gameDate, setGameDate] = useState('')
  const [venue, setVenue] = useState('')
  const [isPlayoff, setIsPlayoff] = useState(false)
  const [adding, setAdding] = useState(false)

  async function handleAddGame(e: FormEvent) {
    e.preventDefault()
    setAdding(true)
    const { error } = await supabase.rpc('add_game', {
      p_season_id: seasonId,
      p_game_number: games.length + 1,
      p_game_date: gameDate || null,
      p_opponent: opponent.trim() || null,
      p_venue: venue.trim() || null,
      p_is_playoff: isPlayoff,
    })
    if (error) alert(error.message)
    else {
      setOpponent('')
      setGameDate('')
      setVenue('')
      setIsPlayoff(false)
      await refresh()
    }
    setAdding(false)
  }

  if (loading) return <p className="muted">Loading games…</p>

  return (
    <div>
      {games.length === 0 ? (
        <p className="muted">No games scheduled yet.</p>
      ) : (
        games.map((g) =>
          editingGameId === g.id ? (
            <EditGameForm
              key={g.id}
              game={g}
              onDone={() => {
                setEditingGameId(null)
                refresh()
              }}
              onCancel={() => setEditingGameId(null)}
            />
          ) : (
            <div key={g.id} className="card" style={{ marginBottom: '0.75rem', padding: '0.9rem 1.1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <span>
                  🏏 Game {g.game_number} — {g.opponent ?? 'TBD'}{' '}
                  {g.is_playoff && <span className="badge badge-invited">playoff</span>} <span className="hint">{g.game_date ?? ''}</span>
                  {g.venue && <span className="hint"> · {g.venue}</span>}
                </span>
                {isOfficer && (
                  <span style={{ display: 'flex', gap: '0.4rem' }}>
                    <button className="btn btn-outline btn-sm" onClick={() => setEditingGameId(g.id)}>
                      ✏️ Edit
                    </button>
                    <button className="btn btn-outline btn-sm" onClick={() => setExpandedGameId(expandedGameId === g.id ? null : g.id)}>
                      {expandedGameId === g.id ? 'Hide attendance' : 'Attendance'}
                    </button>
                  </span>
                )}
              </div>
              {expandedGameId === g.id && <AttendanceEditor gameId={g.id} roster={roster} />}
            </div>
          ),
        )
      )}

      {isOfficer && (
        <div className="card">
          <h2 className="section-title" style={{ marginTop: 0 }}>
            ➕ Add a game
          </h2>
          <form onSubmit={handleAddGame} className="form-stack" style={{ maxWidth: 420 }}>
            <label>
              Opponent
              <input placeholder="Opponent" value={opponent} onChange={(e) => setOpponent(e.target.value)} />
            </label>
            <label>
              Date
              <input type="date" value={gameDate} onChange={(e) => setGameDate(e.target.value)} />
            </label>
            <label>
              Venue
              <input placeholder="Venue" value={venue} onChange={(e) => setVenue(e.target.value)} />
            </label>
            <label style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem' }}>
              <input type="checkbox" checked={isPlayoff} onChange={(e) => setIsPlayoff(e.target.checked)} style={{ width: 'auto' }} />
              Playoff
            </label>
            <button type="submit" disabled={adding} className="btn btn-primary">
              {adding ? 'Adding…' : 'Add game'}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}

function EditGameForm({ game, onDone, onCancel }: { game: Game; onDone: () => void; onCancel: () => void }) {
  const [gameNumber, setGameNumber] = useState(String(game.game_number ?? ''))
  const [opponent, setOpponent] = useState(game.opponent ?? '')
  const [gameDate, setGameDate] = useState(game.game_date ?? '')
  const [venue, setVenue] = useState(game.venue ?? '')
  const [isPlayoff, setIsPlayoff] = useState(game.is_playoff)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    const { error } = await supabase.rpc('update_game', {
      p_game_id: game.id,
      p_game_number: gameNumber.trim() ? Number(gameNumber) : null,
      p_game_date: gameDate || null,
      p_opponent: opponent.trim() || null,
      p_venue: venue.trim() || null,
      p_is_playoff: isPlayoff,
    })
    setSaving(false)
    if (error) {
      setError(error.message)
      return
    }
    onDone()
  }

  return (
    <div className="card" style={{ marginBottom: '0.75rem' }}>
      <h2 className="section-title" style={{ marginTop: 0 }}>
        ✏️ Edit game
      </h2>
      <form onSubmit={handleSave} className="form-stack" style={{ maxWidth: 420 }}>
        <label>
          Game number
          <input type="number" min="1" value={gameNumber} onChange={(e) => setGameNumber(e.target.value)} />
        </label>
        <label>
          Opponent
          <input placeholder="Opponent" value={opponent} onChange={(e) => setOpponent(e.target.value)} />
        </label>
        <label>
          Date
          <input type="date" value={gameDate} onChange={(e) => setGameDate(e.target.value)} />
        </label>
        <label>
          Venue
          <input placeholder="Venue" value={venue} onChange={(e) => setVenue(e.target.value)} />
        </label>
        <label style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem' }}>
          <input type="checkbox" checked={isPlayoff} onChange={(e) => setIsPlayoff(e.target.checked)} style={{ width: 'auto' }} />
          Playoff
        </label>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button type="submit" disabled={saving} className="btn btn-primary">
            {saving ? 'Saving…' : 'Save changes'}
          </button>
          <button type="button" className="btn btn-outline" onClick={onCancel}>
            Cancel
          </button>
        </div>
        {error && <p className="error-text">{error}</p>}
      </form>
    </div>
  )
}

function AttendanceEditor({ gameId, roster }: { gameId: string; roster: RosterMember[] }) {
  const [attendance, setAttendance] = useState<Record<string, boolean>>({})
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    supabase
      .from('game_attendance')
      .select('player_id, played')
      .eq('game_id', gameId)
      .then(({ data }) => {
        if (cancelled) return
        const map: Record<string, boolean> = {}
        for (const row of data ?? []) map[row.player_id] = row.played
        setAttendance(map)
        setLoaded(true)
      })
    return () => {
      cancelled = true
    }
  }, [gameId])

  async function toggle(playerId: string, played: boolean) {
    setAttendance((prev) => ({ ...prev, [playerId]: played }))
    const { error } = await supabase.rpc('set_attendance', { p_game_id: gameId, p_player_id: playerId, p_played: played })
    if (error) alert(error.message)
  }

  if (!loaded) return <p className="muted">Loading attendance…</p>

  return (
    <div style={{ marginTop: '0.75rem', borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
      {roster
        .filter((m) => m.user_id && m.status !== 'inactive')
        .map((m) => (
          <label key={m.user_id} style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem', fontWeight: 400 }}>
            <input
              type="checkbox"
              checked={attendance[m.user_id!] ?? false}
              onChange={(e) => toggle(m.user_id!, e.target.checked)}
              style={{ width: 'auto' }}
            />
            {rosterMemberName(m)}
          </label>
        ))}
    </div>
  )
}
