export interface Team {
  id: string
  name: string
  sport: string
  city: string | null
  default_practice_hourly_rate: number
  join_code: string
  created_by: string
  created_at: string
}

export const OFFICER_ROLE_KEYS = ['treasurer', 'captain', 'vice_captain', 'board_member'] as const
export type OfficerRoleKey = (typeof OFFICER_ROLE_KEYS)[number]

export const OFFICER_ROLE_LABELS: Record<OfficerRoleKey, string> = {
  treasurer: 'Treasurer',
  captain: 'Captain',
  vice_captain: 'Vice Captain',
  board_member: 'Board Member',
}

export interface RosterMember {
  id: string
  user_id: string | null
  invite_email: string | null
  display_name: string | null
  status: 'invited' | 'active' | 'inactive'
  profiles: { full_name: string; email: string | null } | null
}

export interface OfficerRoleRow {
  id: string
  role_key: OfficerRoleKey
  user_id: string
  profiles: { full_name: string; email: string | null } | null
}

// Best-effort display name for a roster row, whether they've signed in yet or not.
export function rosterMemberName(member: RosterMember): string {
  return member.profiles?.full_name ?? member.display_name ?? member.invite_email ?? 'Unknown'
}
