export function HelpScreen() {
  return (
    <div>
      <div className="card">
        <h2 className="section-title" style={{ marginTop: 0 }}>
          🏆 What TeamKitty is for
        </h2>
        <p>
          TeamKitty keeps track of the team's money and games — who paid what, who approved it, who played which
          games, and what everyone's owed back at season's end. It never actually moves money (no payments happen
          inside the app); it's a shared, honest record of what happened outside it — Venmo, cash, Zelle, whatever
          your team already uses.
        </p>
      </div>

      <div className="card">
        <h2 className="section-title" style={{ marginTop: 0 }}>
          🔑 Joining a team
        </h2>
        <p>
          Sign up with your email and a password. After that, you'll be asked to join a team — enter the{' '}
          <strong>join code</strong> an officer shares with you (six letters/numbers, found on the 👥 Roster tab).
          That's it — no waiting for an officer to add you first.
        </p>
      </div>

      <div className="card">
        <h2 className="section-title" style={{ marginTop: 0 }}>
          🎖️ Roles — who can do what
        </h2>
        <div className="table-card" style={{ marginBottom: 0 }}>
          <table>
            <thead>
              <tr>
                <th>Role</th>
                <th>Can do</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ fontWeight: 600 }}>Everyone (players)</td>
                <td>Submit transactions, view the ledger and games, book/claim practice sessions, edit their own name.</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 600 }}>Treasurer</td>
                <td>Everything above, plus approve/reject most submissions and manage the season and roster.</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 600 }}>Captain, Vice Captain, Board Member</td>
                <td>
                  Officers too — can create/edit seasons, add/remove players, reassign roles, and add/edit games. The
                  Captain specifically also approves the <em>Treasurer's own</em> submissions (see below).
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="hint" style={{ marginTop: '0.75rem', marginBottom: 0 }}>
          Any officer can hand a role to someone else from the 👥 Roster tab at any time.
        </p>
      </div>

      <div className="card">
        <h2 className="section-title" style={{ marginTop: 0 }}>
          💰 How a ledger entry gets approved (maker-checker)
        </h2>
        <p style={{ marginTop: 0 }}>Nobody can approve their own submission. Specifically:</p>
        <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
          <li>
            A <strong>Treasurer's</strong> submission needs the <strong>Captain</strong> to acknowledge it.
          </li>
          <li>
            Anyone else's submission needs the <strong>Treasurer</strong> to acknowledge it.
          </li>
        </ul>
        <p>
          An entry only affects the team's balance once it's <span className="badge badge-acknowledged">acknowledged</span>. Until
          then it's <span className="badge badge-pending">pending</span> and invisible to the balance. The
          person who submitted it can <strong>withdraw</strong> it while still pending; an officer can{' '}
          <strong>void</strong> it afterward (with a reason) if a mistake slips through — nothing is ever silently
          deleted, so there's always a full history. If a receipt photo was attached, a 📎 button appears next to the
          entry for anyone reviewing or looking back at it.
        </p>
      </div>

      <div className="card">
        <h2 className="section-title" style={{ marginTop: 0 }}>
          🌱 Seasons
        </h2>
        <p>
          Everything (fees, games, the running balance) lives inside a season. An officer creates one from the season
          dropdown at the top (➕ New season) and sets the registration fee, league fee, planned games, and cost per
          game played. The opening balance carries forward automatically from whatever the previous season closed
          with — nothing needs to be re-entered. Settings can be changed anytime from ⚙️ Edit season, right next to
          it.
        </p>
      </div>

      <div className="card">
        <h2 className="section-title" style={{ marginTop: 0 }}>
          🏏 Games and fee returns
        </h2>
        <p>
          Officers add games and mark who actually played (Games tab → Attendance). The 📊 Overview tab uses that,
          plus the season's "cost per game" setting, to suggest how much each player should get back at the end of
          the season based on games they actually played versus what they paid in registration.
        </p>
      </div>

      <div className="card">
        <h2 className="section-title" style={{ marginTop: 0 }}>
          🥅 Practice (nets) cost-splitting
        </h2>
        <p>
          This is separate from the team kitty — it's just a fair way to split a court booking between whoever showed
          up. Whoever booked it enters what they actually paid and who attended; the cost splits evenly. Everyone
          else sees their share and taps <strong>"I paid my share"</strong> once they've paid the booker directly
          (outside the app); the booker then taps <strong>"Confirm received"</strong>. None of this touches the team
          ledger or balance.
        </p>
      </div>

      <div className="card">
        <h2 className="section-title" style={{ marginTop: 0 }}>
          👥 Managing the roster
        </h2>
        <p>
          Officers add players by email from the Roster tab (they get an editable placeholder until they sign up and
          join). Removing a player doesn't delete anything — it just moves them out of the active roster; their
          history stays intact and an officer can add them back anytime from "Removed players."
        </p>
      </div>
    </div>
  )
}
