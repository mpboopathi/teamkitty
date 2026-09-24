import { supabase } from '../../lib/supabaseClient'

// Receipts live in a private storage bucket, so viewing one means minting a
// short-lived signed URL on demand rather than linking to it directly.
export async function viewReceipt(storagePath: string) {
  const { data, error } = await supabase.storage.from('receipts').createSignedUrl(storagePath, 60)
  if (error || !data?.signedUrl) {
    alert(error?.message ?? 'Could not open receipt')
    return
  }
  window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
}
