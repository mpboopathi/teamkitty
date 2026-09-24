export interface PracticeParticipant {
  id: string
  player_id: string
  share_amount: number
  status: 'unpaid' | 'claimed_paid' | 'confirmed'
  player: { full_name: string } | null
}

export interface PracticeSession {
  id: string
  team_id: string
  session_date: string
  location: string | null
  hourly_rate: number
  hours_booked: number
  total_cost: number
  paid_by: string
  notes: string | null
  payer: { full_name: string } | null
  practice_participants: PracticeParticipant[]
}
