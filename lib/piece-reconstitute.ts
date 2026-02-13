/**
 * Reconstitution helpers for Project/Scenario architecture.
 *
 * The calculation engine expects flat PieceTerminalConfig[] objects.
 * Projects store baseline (shared) and scenarios store electrification choices separately.
 * These helpers merge and split between the two representations.
 *
 * Operations data (throughput + vessel calls) lives in baseline (shared across scenarios).
 * Port services (offshore equipment) lives at project/scenario root level (port-wide).
 */

import type {
  BaselineTerminalConfig,
  BerthDefinition,
  BerthVesselCall,
  PieceTerminalConfig,
  PortServicesBaseline,
  PortServicesScenario,
  ProjectBaseline,
  ScenarioConfig,
  ScenarioTerminalConfig,
} from '@/lib/types'

/**
 * Reconstitute flat PieceTerminalConfig[] from project baseline + scenario config.
 * Also extracts port-level port services.
 *
 * Backward compat:
 * - If baseline has no vessel_calls/annual_teu, fall back to scenario data
 * - If baseline root has no port_services_baseline, scan terminals[0] for legacy data
 */
export function reconstitutePieceTerminals(
  baseline: ProjectBaseline,
  scenario: ScenarioConfig,
): {
  terminals: PieceTerminalConfig[]
  portServicesBaseline: PortServicesBaseline | null
  portServicesScenario: PortServicesScenario | null
} {
  // Port services: prefer root-level, fall back to first terminal (legacy)
  let portServicesBaseline: PortServicesBaseline | null = baseline.port_services_baseline ?? null
  let portServicesScenario: PortServicesScenario | null = scenario.port_services_scenario ?? null

  // Backward compat: scan terminals for legacy port_services
  if (!portServicesBaseline) {
    for (const bt of baseline.terminals) {
      const legacy = (bt as Record<string, unknown>).port_services_baseline as PortServicesBaseline | undefined
      if (legacy) { portServicesBaseline = legacy; break }
    }
  }
  if (!portServicesScenario) {
    for (const st of scenario.terminals) {
      const legacy = (st as Record<string, unknown>).port_services_scenario as PortServicesScenario | undefined
      if (legacy) { portServicesScenario = legacy; break }
    }
  }

  const terminals = baseline.terminals.map((bt) => {
    const st = scenario.terminals.find((s) => s.terminal_id === bt.id)

    // Backward compat: old scenarios may still have throughput + vessel_calls_by_berth
    const legacySt = st as Record<string, unknown> | undefined

    // Berths are simple — no vessel_calls to merge
    const berths: BerthDefinition[] = bt.berths.map((bb) => ({
      id: bb.id,
      berth_number: bb.berth_number,
      berth_name: bb.berth_name,
      max_vessel_segment_key: bb.max_vessel_segment_key,
      ops_existing: bb.ops_existing,
      dc_existing: bb.dc_existing,
    }))

    // Vessel calls: prefer baseline, fall back to old scenario vessel_calls_by_berth
    let vesselCalls: BerthVesselCall[] = bt.vessel_calls ?? []
    if (vesselCalls.length === 0 && legacySt?.vessel_calls_by_berth) {
      const byBerth = legacySt.vessel_calls_by_berth as Record<string, BerthVesselCall[]>
      vesselCalls = Object.values(byBerth).flat()
    }

    return {
      id: bt.id,
      name: bt.name,
      terminal_type: bt.terminal_type,
      // Throughput: prefer baseline, fall back to old scenario
      annual_teu: bt.annual_teu ?? (legacySt?.annual_teu as number) ?? 0,
      annual_passengers: bt.annual_passengers ?? (legacySt?.annual_passengers as number | undefined),
      annual_ceu: bt.annual_ceu ?? (legacySt?.annual_ceu as number | undefined),
      vessel_calls: vesselCalls,
      baseline_equipment: bt.baseline_equipment,
      berths,
      cable_length_m: bt.cable_length_m,
      scenario_equipment: st?.scenario_equipment ?? {},
      berth_scenarios: st?.berth_scenarios ?? [],
      charger_overrides: st?.charger_overrides,
    }
  })

  return { terminals, portServicesBaseline, portServicesScenario }
}

/**
 * Decompose flat PieceTerminalConfig[] into project baseline + scenario config.
 * Port services are passed separately (port-level, not per-terminal).
 */
export function decomposePieceTerminals(
  terminals: PieceTerminalConfig[],
  portServicesBaseline?: PortServicesBaseline | null,
  portServicesScenario?: PortServicesScenario | null,
): { baseline: ProjectBaseline; scenario: ScenarioConfig } {
  const baselineTerminals: BaselineTerminalConfig[] = []
  const scenarioTerminals: ScenarioTerminalConfig[] = []

  for (const t of terminals) {
    baselineTerminals.push({
      id: t.id,
      name: t.name,
      terminal_type: t.terminal_type,
      berths: t.berths,
      baseline_equipment: t.baseline_equipment,
      cable_length_m: t.cable_length_m,
      // Operations data lives in baseline
      annual_teu: t.annual_teu,
      annual_passengers: t.annual_passengers,
      annual_ceu: t.annual_ceu,
      vessel_calls: t.vessel_calls ?? [],
    })

    scenarioTerminals.push({
      terminal_id: t.id,
      scenario_equipment: t.scenario_equipment,
      berth_scenarios: t.berth_scenarios,
      charger_overrides: t.charger_overrides,
    })
  }

  return {
    baseline: {
      terminals: baselineTerminals,
      port_services_baseline: portServicesBaseline ?? undefined,
    },
    scenario: {
      terminals: scenarioTerminals,
      port_services_scenario: portServicesScenario ?? undefined,
    },
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
      scenario_equipment: {},
      berth_scenarios: bt.berths.map((b) => ({
        berth_id: b.id,
        ops_enabled: false,
        dc_enabled: false,
      })),
    })),
  }
}
