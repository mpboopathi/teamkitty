export interface League {
  id: string
  name: string
  sport: string | null
  region: string | null
}

export interface Season {
  id: string
  team_id: string
  league_id: string | null
  league_division: string | null
  name: string
  start_date: string | null
  end_date: string | null
  status: 'draft' | 'active' | 'closed'
  opening_balance: number
  registration_fee_amount: number
  league_fee_amount: number
  planned_game_count: number
  per_game_cost: number | null
}
