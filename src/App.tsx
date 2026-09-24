import { useEffect, useState } from 'react'
import { useAuth } from './features/auth/useAuth'
import { useProfile } from './features/auth/useProfile'
import { LoginScreen } from './features/auth/LoginScreen'
import { CompleteProfileScreen } from './features/auth/CompleteProfileScreen'
import { useMyTeams } from './features/teams/useMyTeams'
import { JoinOrCreateTeamScreen } from './features/teams/JoinOrCreateTeamScreen'
import { TeamRoster } from './features/teams/TeamRoster'
import { useTeamRoster } from './features/teams/useTeamRoster'
import { useSeasons } from './features/seasons/useSeasons'
import { CreateSeasonScreen } from './features/seasons/CreateSeasonScreen'
import { EditSeasonSettingsForm } from './features/seasons/EditSeasonSettingsForm'
import { useLedgerEntries } from './features/ledger/useLedgerEntries'
import { SubmitLedgerEntryForm } from './features/ledger/SubmitLedgerEntryForm'
import { PendingApprovals } from './features/ledger/PendingApprovals'
import { LedgerHistory } from './features/ledger/LedgerHistory'
import { GamesPanel } from './features/games/GamesPanel'
import { SeasonSummary } from './features/dashboard/SeasonSummary'
import { PracticePanel } from './features/practice/PracticePanel'
import { HelpScreen } from './features/help/HelpScreen'
import { LandingScreen } from './features/help/LandingScreen'
import { supabase } from './lib/supabaseClient'

type Tab = 'overview' | 'ledger' | 'games' | 'practice' | 'roster' | 'help'

const TAB_LABELS: Record<Tab, string> = {
  overview: '📊 Overview',
  ledger: '💰 Ledger',
  games: '🏏 Games',
  practice: '🥅 Practice',
  roster: '👥 Roster',
  help: '❓ How it works',
}

function App() {
  const { session, loading: authLoading } = useAuth()
  const { profile, loading: profileLoading, refresh: refreshProfile } = useProfile(session)
  const { teams, loading: teamsLoading, refresh: refreshTeams } = useMyTeams(session)
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('overview')
  const [showNewSeasonForm, setShowNewSeasonForm] = useState(false)
  const [showEditSeasonForm, setShowEditSeasonForm] = useState(false)
  const [priorClosingBalance, setPriorClosingBalance] = useState<number | null>(null)
  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const [savingName, setSavingName] = useState(false)
  const [showAuth, setShowAuth] = useState(false)

  const team = teams[0] ?? null
  const { members, officers } = useTeamRoster(team?.id ?? null)
  const { seasons, loading: seasonsLoading, refresh: refreshSeasons } = useSeasons(team?.id ?? null)
  const activeSeasonId = selectedSeasonId ?? seasons[0]?.id ?? null
  const activeSeason = seasons.find((s) => s.id === activeSeasonId) ?? null
  const { entries, refresh: refreshEntries } = useLedgerEntries(activeSeasonId)

  useEffect(() => {
    if (!showNewSeasonForm || !seasons[0]) {
      setPriorClosingBalance(null)
      return
    }
    let cancelled = false
    supabase.rpc('season_closing_balance', { p_season_id: seasons[0].id }).then(({ data }) => {
      if (!cancelled) setPriorClosingBalance(typeof data === 'number' ? data : null)
    })
    return () => {
      cancelled = true
    }
  }, [showNewSeasonForm, seasons])

  async function handleSaveName() {
    if (!session || !nameDraft.trim()) return
    setSavingName(true)
    const { error } = await supabase.from('profiles').update({ full_name: nameDraft.trim() }).eq('id', session.user.id)
    setSavingName(false)
    if (error) {
      alert(error.message)
      return
    }
    setEditingName(false)
    refreshProfile()
  }

  if (authLoading) return <p className="center-shell muted">Loading…</p>
  if (!session) {
    if (!showAuth) return <LandingScreen onGetStarted={() => setShowAuth(true)} />
    return <LoginScreen onBack={() => setShowAuth(false)} />
  }
  if (profileLoading) return <p className="center-shell muted">Loading your profile…</p>
  if (!profile) return <CompleteProfileScreen session={session} onDone={refreshProfile} />
  if (teamsLoading) return <p className="center-shell muted">Loading your teams…</p>
  if (!team) return <JoinOrCreateTeamScreen onJoined={refreshTeams} onCreated={refreshTeams} />

  const isOfficer = officers.some((o) => o.user_id === session.user.id)

  return (
    <main className="page-shell">
      <header className="app-header">
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <img src="/favicon.svg" alt="" width="30" height="30" style={{ borderRadius: '8px' }} />
          {team.name}
        </h1>
        <div className="whoami">
          {editingName ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
              <input
                autoFocus
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                style={{ padding: '0.3rem 0.5rem', fontSize: '0.9rem', width: '10rem' }}
              />
              <button className="btn btn-secondary btn-sm" disabled={savingName} onClick={handleSaveName}>
                {savingName ? 'Saving…' : 'Save'}
              </button>
              <button className="btn btn-outline btn-sm" onClick={() => setEditingName(false)}>
                Cancel
              </button>
            </span>
          ) : (
            <>
              {profile.full_name} ({profile.email}){' '}
              <button
                className="btn btn-outline btn-sm"
                onClick={() => {
                  setNameDraft(profile.full_name)
                  setEditingName(true)
                }}
              >
                ✏️ Edit name
              </button>{' '}
            </>
          )}
          <button
            className="btn btn-outline btn-sm"
            onClick={() => {
              supabase.auth.signOut()
              setShowAuth(false)
            }}
          >
            Sign out
          </button>
        </div>
      </header>

      <nav className="tab-row">
        {(['overview', 'ledger', 'games', 'practice', 'roster', 'help'] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`tab-btn ${tab === t ? 'active' : ''}`}>
            {TAB_LABELS[t]}
          </button>
        ))}
      </nav>

      {seasonsLoading ? (
        <p className="muted">Loading seasons…</p>
      ) : seasons.length === 0 ? (
        isOfficer ? (
          <CreateSeasonScreen teamId={team.id} priorClosingBalance={null} onCreated={refreshSeasons} />
        ) : (
          <p className="muted">No season has been created yet. Ask a team officer to set one up.</p>
        )
      ) : (
        <>
          <div className="card-tinted" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            <label style={{ flexDirection: 'row', alignItems: 'center', gap: '0.6rem' }}>
              Season
              <select
                value={activeSeasonId ?? ''}
                onChange={(e) => {
                  setSelectedSeasonId(e.target.value)
                  setShowNewSeasonForm(false)
                  setShowEditSeasonForm(false)
                }}
              >
                {seasons.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            {isOfficer && activeSeason && (
              <button
                className="btn btn-outline btn-sm"
                onClick={() => {
                  setShowEditSeasonForm((v) => !v)
                  setShowNewSeasonForm(false)
                }}
              >
                {showEditSeasonForm ? 'Cancel' : '⚙️ Edit season'}
              </button>
            )}
            {isOfficer && (
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setShowNewSeasonForm((v) => !v)
                  setShowEditSeasonForm(false)
                }}
              >
                {showNewSeasonForm ? 'Cancel' : '➕ New season'}
              </button>
            )}
          </div>

          {showNewSeasonForm && (
            <CreateSeasonScreen
              teamId={team.id}
              priorClosingBalance={priorClosingBalance}
              onCreated={() => {
                setShowNewSeasonForm(false)
                refreshSeasons()
              }}
            />
          )}

          {showEditSeasonForm && activeSeason && (
            <EditSeasonSettingsForm
              season={activeSeason}
              onDone={() => {
                setShowEditSeasonForm(false)
                refreshSeasons()
              }}
              onCancel={() => setShowEditSeasonForm(false)}
            />
          )}

          {!showNewSeasonForm && !showEditSeasonForm && activeSeason && tab === 'overview' && (
            <SeasonSummary season={activeSeason} refreshKey={entries.length} />
          )}

          {!showNewSeasonForm && !showEditSeasonForm && activeSeason && tab === 'ledger' && (
            <div>
              <h2 className="section-title">Submit a transaction</h2>
              <div className="card">
                <SubmitLedgerEntryForm
                  seasonId={activeSeason.id}
                  teamId={team.id}
                  roster={members}
                  isOfficer={isOfficer}
                  onSubmitted={refreshEntries}
                />
              </div>

              {isOfficer && (
                <>
                  <h2 className="section-title">Awaiting your approval</h2>
                  <PendingApprovals entries={entries} currentUserId={session.user.id} onChanged={refreshEntries} />
                </>
              )}

              <h2 className="section-title">All transactions this season</h2>
              <LedgerHistory entries={entries} currentUserId={session.user.id} onChanged={refreshEntries} />
            </div>
          )}

          {!showNewSeasonForm && !showEditSeasonForm && activeSeason && tab === 'games' && (
            <GamesPanel seasonId={activeSeason.id} roster={members} isOfficer={isOfficer} />
          )}
        </>
      )}

      {tab === 'practice' && <PracticePanel teamId={team.id} roster={members} currentUserId={session.user.id} />}

      {tab === 'roster' && <TeamRoster team={team} currentUserId={session.user.id} />}

      {tab === 'help' && <HelpScreen />}
    </main>
  )
}

export default App
