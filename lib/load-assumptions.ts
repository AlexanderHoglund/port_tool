/**
 * ═══════════════════════════════════════════════════════════
 * DATA LOADER — Fetches all assumption tables from Supabase
 * ═══════════════════════════════════════════════════════════
 *
 * Loads all 6 assumption tables in parallel and returns a
 * typed AllAssumptions bundle for the calculation engine.
 *
 * Tables queried:
 *   1. container_throughput_benchmarks  (4 rows)
 *   2. equipment_diesel_assumptions     (12 rows)
 *   3. equipment_electric_assumptions   (12 rows)
 *   4. vessel_berth_assumptions         (10 rows)
 *   5. tugboat_assumptions              (3 rows)
 *   6. emission_factors                 (6 rows)
 * ═══════════════════════════════════════════════════════════
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { AllAssumptions } from './types'

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
