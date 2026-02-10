/**
 * Compute a lightweight fingerprint of the current assumption overrides.
 * Used for stale-result detection: if the fingerprint changes after
 * a calculation was run, the results are marked as outdated.
 *
 * Returns a string like "5:1234567890" (count:hash).
 */

import { createBrowserClient } from '@supabase/ssr'

export async function computeAssumptionFingerprint(
  profileName = 'default',
): Promise<string> {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  const { data, count } = await supabase
    .from('piece_assumption_overrides')
    .select('table_name,row_key,column_name,custom_value', { count: 'exact' })
    .eq('profile_name', profileName)
    .order('table_name')
    .order('row_key')
    .order('column_name')

  if (!data || data.length === 0) return '0:'

  // Deterministic string from sorted override values
  const raw = data
    .map((r) => `${r.table_name}|${r.row_key}|${r.column_name}|${r.custom_value}`)
    .join(';')

  // Simple string hash (djb2-like) — no crypto needed for this use case
  let hash = 0
  for (let i = 0; i < raw.length; i++) {
    hash = ((hash << 5) - hash + raw.charCodeAt(i)) | 0
  }

  return `${count}:${Math.abs(hash)}`
}
