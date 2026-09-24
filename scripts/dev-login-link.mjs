// Dev-only helper: generates a one-time sign-in link for a given email,
// WITHOUT needing that inbox to actually receive an email.
//
// Why this exists: to test multiple player identities (roles, approvals,
// etc.) you need each test player to actually sign in once so Supabase
// creates a real auth user for them. Real magic-link email only works if
// the address can receive mail. This script uses the Supabase admin API
// to mint that same kind of link directly.
//
// This does NOT weaken the app's security model — it still creates a real,
// normal auth session through Supabase's own auth system. It just skips
// the "wait for an email" step, and it can only be run by someone who has
// the service_role secret key (never put that key in the app or .env).
//
// Usage:
//   export SUPABASE_SERVICE_ROLE_KEY=your-service-role-key   (once per terminal session)
//   node scripts/dev-login-link.mjs sathish@sdkings.com
//
// Then open the printed link in a fresh Incognito/Private browser window.

import { createClient } from '@supabase/supabase-js'

const email = process.argv[2]
if (!email) {
  console.error('Usage: node scripts/dev-login-link.mjs <email>')
  process.exit(1)
}

const url = process.env.SUPABASE_URL || 'https://nehngvvidyuafycceede.supabase.co'
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!serviceKey) {
  console.error(
    '\nMissing SUPABASE_SERVICE_ROLE_KEY.\n' +
      'Get it from the Supabase dashboard: Project Settings -> API -> "service_role" secret key.\n' +
      'Then run in your terminal (this session only, do not save it to a file):\n\n' +
      '  export SUPABASE_SERVICE_ROLE_KEY=paste-it-here\n'
  )
  process.exit(1)
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const { data, error } = await admin.auth.admin.generateLink({
  type: 'magiclink',
  email,
  options: { redirectTo: 'http://localhost:5173' },
})

if (error) {
  console.error('Failed:', error.message)
  process.exit(1)
}

console.log(`\nOpen this in a FRESH Incognito/Private window to sign in as ${email}:\n`)
console.log(data.properties.action_link)
console.log('\n(One-time use, expires soon — just re-run this script if it goes stale.)\n')
