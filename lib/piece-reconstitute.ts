/**
 * Reconstitution helpers for Project/Scenario architecture.
 *
 * The calculation engine expects flat PieceTerminalConfig[] objects.
 * Projects store baseline (shared) and scenarios store electrification choices separately.
 * These helpers merge and split between the two representations.
 */

import type {
  BaselineBerthDefinition,
  BaselineTerminalConfig,
  BerthDefinition,
  BerthScenarioConfig,
  BerthVesselCall,
  PieceTerminalConfig,
  ProjectBaseline,
  ScenarioConfig,
  ScenarioTerminalConfig,
} from '@/lib/types'

/**
 * Reconstitute flat PieceTerminalConfig[] from project baseline + scenario config.
 * This is what the engine expects.
 */
export function reconstitutePieceTerminals(
  baseline: ProjectBaseline,
  scenario: ScenarioConfig,
): PieceTerminalConfig[] {
  return baseline.terminals.map((bt) => {
    const st = scenario.terminals.find((s) => s.terminal_id === bt.id)

    // Merge baseline berths with scenario vessel_calls
    const berths: BerthDefinition[] = bt.berths.map((bb) => ({
      id: bb.id,
      berth_number: bb.berth_number,
      berth_name: bb.berth_name,
      max_vessel_segment_key: bb.max_vessel_segment_key,
      ops_existing: bb.ops_existing,
      dc_existing: bb.dc_existing,
      vessel_calls: st?.vessel_calls_by_berth[bb.id] ?? [],
    }))

    return {
      id: bt.id,
      name: bt.name,
      terminal_type: bt.terminal_type,
      annual_teu: st?.annual_teu ?? 0,
      annual_passengers: st?.annual_passengers,
      annual_ceu: st?.annual_ceu,
      baseline_equipment: bt.baseline_equipment,
      berths,
      port_services_baseline: bt.port_services_baseline,
      cable_length_m: bt.cable_length_m,
      scenario_equipment: st?.scenario_equipment ?? {},
      berth_scenarios: st?.berth_scenarios ?? [],
      port_services_scenario: st?.port_services_scenario,
      charger_overrides: st?.charger_overrides,
    }
  })
}

/**
 * Decompose flat PieceTerminalConfig[] into project baseline + scenario config.
 * Used when saving from the dashboard.
 */
export function decomposePieceTerminals(
  terminals: PieceTerminalConfig[],
): { baseline: ProjectBaseline; scenario: ScenarioConfig } {
  const baselineTerminals: BaselineTerminalConfig[] = []
  const scenarioTerminals: ScenarioTerminalConfig[] = []

  for (const t of terminals) {
    // Extract baseline berths (strip vessel_calls)
    const baselineBerths: BaselineBerthDefinition[] = t.berths.map((b) => ({
      id: b.id,
      berth_number: b.berth_number,
      berth_name: b.berth_name,
      max_vessel_segment_key: b.max_vessel_segment_key,
      ops_existing: b.ops_existing,
      dc_existing: b.dc_existing,
    }))

    baselineTerminals.push({
      id: t.id,
      name: t.name,
      terminal_type: t.terminal_type,
      berths: baselineBerths,
      baseline_equipment: t.baseline_equipment,
      cable_length_m: t.cable_length_m,
      port_services_baseline: t.port_services_baseline,
    })

    // Extract vessel_calls keyed by berth id
    const vesselCallsByBerth: Record<string, BerthVesselCall[]> = {}
    for (const b of t.berths) {
      if (b.vessel_calls.length > 0) {
        vesselCallsByBerth[b.id] = b.vessel_calls
      }
    }

    scenarioTerminals.push({
      terminal_id: t.id,
      annual_teu: t.annual_teu,
      annual_passengers: t.annual_passengers,
      annual_ceu: t.annual_ceu,
      vessel_calls_by_berth: vesselCallsByBerth,
      scenario_equipment: t.scenario_equipment,
      berth_scenarios: t.berth_scenarios,
      charger_overrides: t.charger_overrides,
      port_services_scenario: t.port_services_scenario,
    })
  }

  return {
    baseline: { terminals: baselineTerminals },
    scenario: { terminals: scenarioTerminals },
  }
}

/**
 * Create an empty scenario config for a project baseline.
 * Used when creating a new scenario for an existing project.
 */
export function createEmptyScenarioConfig(baseline: ProjectBaseline): ScenarioConfig {
  return {
    terminals: baseline.terminals.map((bt) => ({
      terminal_id: bt.id,
      annual_teu: 0,
      vessel_calls_by_berth: {},
      scenario_equipment: {},
      berth_scenarios: bt.berths.map((b) => ({
        berth_id: b.id,
        ops_enabled: false,
        dc_enabled: false,
      })),
    })),
  }
}
