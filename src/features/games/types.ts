export interface Game {
  id: string
  season_id: string
  game_number: number | null
  game_date: string | null
  opponent: string | null
  venue: string | null
  is_playoff: boolean
}
