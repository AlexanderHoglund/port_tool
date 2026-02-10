/**
 * ═══════════════════════════════════════════════════════════
 * DATA LOADER — Fetches all assumption tables from Supabase
 * ═══════════════════════════════════════════════════════════
 *
 * Loads all assumption tables in parallel and returns a
 * typed bundle for the calculation engine.
 *
 * Original tables (6):
 *   1. container_throughput_benchmarks  (4 rows)
 *   2. equipment_diesel_assumptions     (12 rows)
 *   3. equipment_electric_assumptions   (12 rows)
 *   4. vessel_berth_assumptions         (10 rows)
 *   5. tugboat_assumptions              (3 rows)
 *   6. emission_factors                 (6 rows)
 *
 * PIECE tables (5):
 *   1. piece_equipment                  (12 rows)
 *   2. piece_evse                       (5 rows)
 *   3. piece_fleet_ops                  (13 rows)
 *   4. piece_grid                       (14 rows)
 *   5. economic_assumptions             (16 rows)
 * ═══════════════════════════════════════════════════════════
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { AllAssumptions, PieceAssumptions, AllPieceAssumptions, OverrideMap, PieceAssumptionOverride } from './types'

// Maps each table to its unique row-key column name
const TABLE_ROW_KEYS: Record<string, string> = {
  economic_assumptions: 'assumption_key',
  piece_equipment: 'equipment_key',
  piece_evse: 'evse_key',
  piece_fleet_ops: 'vessel_segment_key',
  piece_grid: 'component_key',
}

export async function loadAllAssumptions(
  supabase: SupabaseClient,
): Promise<AllAssumptions> {
  const [
    benchmarksRes,
    dieselRes,
    electricRes,
    vesselRes,
    tugRes,
    emissionRes,
  ] = await Promise.all([
    supabase.from('container_throughput_benchmarks').select('*'),
    supabase.from('equipment_diesel_assumptions').select('*'),
    supabase.from('equipment_electric_assumptions').select('*'),
    supabase.from('vessel_berth_assumptions').select('*'),
    supabase.from('tugboat_assumptions').select('*'),
    supabase.from('emission_factors').select('*'),
  ])

  // Check for errors on any table
  const errors = [
    benchmarksRes.error,
    dieselRes.error,
    electricRes.error,
    vesselRes.error,
    tugRes.error,
    emissionRes.error,
  ].filter(Boolean)

  if (errors.length > 0) {
    const messages = errors.map(e => e?.message).join('; ')
    throw new Error(`Failed to load assumptions: ${messages}`)
  }

  return {
    benchmarks: benchmarksRes.data ?? [],
    dieselEquipment: dieselRes.data ?? [],
    electricEquipment: electricRes.data ?? [],
    vesselBerth: vesselRes.data ?? [],
    tugboat: tugRes.data ?? [],
    emissionFactors: emissionRes.data ?? [],
  }
}

/**
 * Load PIECE-specific assumptions (5 new tables)
 */
export async function loadPieceAssumptions(
  supabase: SupabaseClient,
): Promise<PieceAssumptions> {
  const [
    equipmentRes,
    evseRes,
    fleetOpsRes,
    gridRes,
    economicRes,
  ] = await Promise.all([
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
    const messages = errors.map(e => e?.message).join('; ')
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
 * Load all assumptions (original + PIECE) for full functionality
 */
export async function loadAllPieceAssumptions(
  supabase: SupabaseClient,
): Promise<AllPieceAssumptions> {
  const [original, piece] = await Promise.all([
    loadAllAssumptions(supabase),
    loadPieceAssumptions(supabase),
  ])

  return {
    ...original,
    piece,
  }
}

/**
 * Load custom overrides for a given profile from piece_assumption_overrides.
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

/**
 * Apply overrides to a row array. Each row is cloned and numeric fields
 * are replaced if a matching override exists.
 */
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

/** Re-export TABLE_ROW_KEYS for use by the Assumptions page */
export { TABLE_ROW_KEYS }
