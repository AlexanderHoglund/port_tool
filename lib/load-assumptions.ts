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
import type { AllAssumptions, PieceAssumptions, AllPieceAssumptions } from './types'

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
