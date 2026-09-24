export interface LedgerCategory {
  id: string
  key: string
  label: string
  kind: 'income' | 'expense'
  receipts_recommended: boolean
}

export interface LedgerAttachment {
  id: string
  storage_path: string
  file_name: string | null
}

export interface LedgerEntry {
  id: string
  season_id: string
  category_id: string
  amount: number
  player_id: string | null
  game_id: string | null
  payee_name: string | null
  note: string | null
  occurred_on: string
  status: 'pending' | 'acknowledged' | 'rejected' | 'withdrawn' | 'voided'
  created_by: string
  acknowledged_by: string | null
  acknowledged_at: string | null
  voided_by: string | null
  voided_at: string | null
  void_reason: string | null
  created_at: string
  ledger_categories: LedgerCategory | null
  creator: { full_name: string } | null
  player: { full_name: string } | null
  attachments: LedgerAttachment[]
}
