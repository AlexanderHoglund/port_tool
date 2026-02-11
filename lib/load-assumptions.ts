/**
 * Data loader — fetches PIECE assumption tables from Supabase
 * and applies custom overrides.
 *
 * PIECE tables (5):
 *   1. piece_equipment
 *   2. piece_evse
 *   3. piece_fleet_ops
 *   4. piece_grid
 *   5. economic_assumptions
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { PieceAssumptions, OverrideMap, PieceAssumptionOverride } from './types'

const TABLE_ROW_KEYS: Record<string, string> = {
  economic_assumptions: 'assumption_key',
  piece_equipment: 'equipment_key',
  piece_evse: 'evse_key',
  piece_fleet_ops: 'vessel_segment_key',
  piece_grid: 'component_key',
}

export async function loadPieceAssumptions(
  supabase: SupabaseClient,
): Promise<PieceAssumptions> {
  const [equipmentRes, evseRes, fleetOpsRes, gridRes, economicRes] =
    await Promise.all([
      supabase.from('piece_equipment').select('*'),
      supabase.from('piece_evse').select('*'),
      supabase.from('piece_fleet_ops').select('*'),
      supabase.from('piece_grid').select('*'),
      supabase.from('economic_assumptions').select('*'),
    ])

  const errors = [
    equipmentRes.error,
    evseRes.error,
    fleetOpsRes.error,
    gridRes.error,
    economicRes.error,
  ].filter(Boolean)

  if (errors.length > 0) {
    const messages = errors.map((e) => e?.message).join('; ')
    throw new Error(`Failed to load PIECE assumptions: ${messages}`)
  }

  return {
    equipment: equipmentRes.data ?? [],
    evse: evseRes.data ?? [],
    fleetOps: fleetOpsRes.data ?? [],
    grid: gridRes.data ?? [],
    economic: economicRes.data ?? [],
  }
}

/**
 * Load custom overrides for a given profile.
 * Returns a nested map: { tableName: { rowKey: { columnName: value } } }
 */
export async function loadOverrides(
  supabase: SupabaseClient,
  profileName: string = 'default',
): Promise<OverrideMap> {
  const { data, error } = await supabase
    .from('piece_assumption_overrides')
    .select('*')
    .eq('profile_name', profileName)

  if (error) {
    throw new Error(`Failed to load overrides: ${error.message}`)
  }

  const map: OverrideMap = {}
  for (const row of (data ?? []) as PieceAssumptionOverride[]) {
    if (!map[row.table_name]) map[row.table_name] = {}
    if (!map[row.table_name][row.row_key]) map[row.table_name][row.row_key] = {}
    map[row.table_name][row.row_key][row.column_name] = row.custom_value
  }
  return map
}

function applyOverridesToRows<T extends Record<string, unknown>>(
  rows: T[],
  tableName: string,
  overrides: OverrideMap,
): T[] {
  const tableOverrides = overrides[tableName]
  if (!tableOverrides) return rows

  const keyColumn = TABLE_ROW_KEYS[tableName]
  if (!keyColumn) return rows

  return rows.map((row) => {
    const rowKey = String(row[keyColumn])
    const rowOverrides = tableOverrides[rowKey]
    if (!rowOverrides) return row

    const merged = { ...row }
    for (const [col, val] of Object.entries(rowOverrides)) {
      if (col in merged) {
        ;(merged as Record<string, unknown>)[col] = val
      }
    }
    return merged
  })
}

/**
 * Merge overrides into a PieceAssumptions bundle.
 * Returns a new object — originals are not mutated.
 */
export function mergeAssumptions(
  defaults: PieceAssumptions,
  overrides: OverrideMap,
): PieceAssumptions {
  return {
    equipment: applyOverridesToRows(defaults.equipment, 'piece_equipment', overrides),
    evse: applyOverridesToRows(defaults.evse, 'piece_evse', overrides),
    fleetOps: applyOverridesToRows(defaults.fleetOps, 'piece_fleet_ops', overrides),
    grid: applyOverridesToRows(defaults.grid, 'piece_grid', overrides),
    economic: applyOverridesToRows(defaults.economic, 'economic_assumptions', overrides),
  }
}
