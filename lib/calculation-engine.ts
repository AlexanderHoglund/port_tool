/**
 * ═══════════════════════════════════════════════════════════════
 * PORT ENERGY TRANSITION — CALCULATION ENGINE
 * ═══════════════════════════════════════════════════════════════
 *
 * Pure functions — no database calls. All assumption data is
 * passed in from the data-loading layer.
 *
 * Architecture:
 *   calculatePort()
 *     └─ calculateTerminal()  (per terminal)
 *          ├─ calculateDieselFleet()     → baseline onshore
 *          ├─ calculateElectricFleet()   → scenario onshore
 *          ├─ calculateOffshore()        → baseline + scenario offshore
 *          └─ calculateBenchmark()       → throughput reference
 *
 * All monetary values in USD. All energy in kWh. All fuel in liters.
 * All emissions in metric tons CO2.
 * ═══════════════════════════════════════════════════════════════
 */

import type {
  CalculationRequest,
  PortResult,
  TerminalResult,
  TerminalConfig,
  FleetMetrics,
  OffshoreMetrics,
  BenchmarkMetrics,
  EquipmentLineItem,
  DeltaMetrics,
  AggregatedTotals,
  AllAssumptions,
  DieselAssumptionRow,
  ElectricAssumptionRow,
  VesselCallConfig,
  TugConfig,
  VesselBerthRow,
  TugboatAssumptionRow,
  ThroughputBenchmarkRow,
} from './types'

// ─────────────────────────────────────────────────────────
// SECTION 1: ONSHORE — DIESEL FLEET (Baseline)
// ─────────────────────────────────────────────────────────
// Tables used: equipment_diesel_assumptions, equipment_electric_assumptions
//
// For each equipment type with qty > 0:
//   - If fuel_consumption_l_per_hour > 0 (true diesel equipment):
//       diesel_L   = annual_operating_hours × fuel_L_per_hour × qty
//       fuel_cost  = diesel_L × diesel_price_per_liter
//       co2_tons   = diesel_L × co2_kg_per_liter / 1000
//       maintenance = annual_maintenance_usd × qty
//
//   - If fuel_consumption_l_per_hour = 0 (already electric, e.g. STS crane):
//       Look up electric assumptions for this equipment_key
//       kwh        = annual_operating_hours × kwh_per_hour × qty
//       energy_cost = kwh × energy_cost_per_kwh
//       co2_tons   = kwh × co2_kg_per_kwh / 1000
//       maintenance = electric_table.annual_maintenance_usd × qty
//       (uses electric maintenance since the equipment IS electric)
// ─────────────────────────────────────────────────────────

export function calculateDieselFleet(
  equipment: Record<string, number>,
  dieselAssumptions: DieselAssumptionRow[],
  electricAssumptions: ElectricAssumptionRow[],
): { totals: FleetMetrics; detail: EquipmentLineItem[] } {
  const detail: EquipmentLineItem[] = []
  let totalDiesel = 0
  let totalKwh = 0
  let totalCo2 = 0
  let totalFuelCost = 0
  let totalEnergyCost = 0
  let totalMaintenance = 0

  for (const [key, qty] of Object.entries(equipment)) {
    if (qty <= 0) continue

    const diesel = dieselAssumptions.find(a => a.equipment_key === key)
    if (!diesel) continue

    let annualDiesel = 0
    let annualKwh = 0
    let annualCo2 = 0
    let annualFuelCost = 0
    let annualEnergyCost = 0
    let annualMaintenance = 0

    const elec = electricAssumptions.find(a => a.equipment_key === key)

    if (diesel.fuel_consumption_l_per_hour > 0) {
      // ── True diesel equipment ──
      // Formula: diesel_L = hours × L/hour × qty
      annualDiesel = diesel.annual_operating_hours * diesel.fuel_consumption_l_per_hour * qty
      annualFuelCost = annualDiesel * diesel.diesel_price_per_liter
      // Formula: CO2 = diesel_L × kg_CO2/L ÷ 1000 → tons
      annualCo2 = annualDiesel * diesel.co2_kg_per_liter_diesel / 1000
      annualMaintenance = diesel.annual_maintenance_usd * qty
    } else {
      // ── Already-electric equipment in baseline ──
      // Use electric assumptions for power consumption AND maintenance,
      // since this equipment is electric in both baseline and scenario.
      if (elec) {
        // Formula: kWh = hours × kWh/hour × qty
        annualKwh = elec.annual_operating_hours * elec.power_consumption_kwh_per_hour * qty
        annualEnergyCost = annualKwh * elec.energy_cost_per_kwh
        // Formula: CO2 = kWh × kg_CO2/kWh ÷ 1000 → tons
        annualCo2 = annualKwh * elec.co2_kg_per_kwh_grid / 1000
        annualMaintenance = elec.annual_maintenance_usd * qty
      } else {
        annualMaintenance = diesel.annual_maintenance_usd * qty
      }
    }
    const annualTotalOpex = annualFuelCost + annualEnergyCost + annualMaintenance

    totalDiesel += annualDiesel
    totalKwh += annualKwh
    totalCo2 += annualCo2
    totalFuelCost += annualFuelCost
    totalEnergyCost += annualEnergyCost
    totalMaintenance += annualMaintenance

    detail.push({
      equipment_key: key,
      display_name: diesel.display_name,
      equipment_type: diesel.equipment_type,
      unit_label: diesel.unit_label,
      quantity: qty,
      annual_diesel_liters: annualDiesel,
      annual_electricity_kwh: annualKwh,
      annual_co2_tons: annualCo2,
      annual_fuel_cost_usd: annualFuelCost,
      annual_energy_cost_usd: annualEnergyCost,
      annual_maintenance_usd: annualMaintenance,
      annual_total_opex_usd: annualTotalOpex,
    })
  }

  return {
    totals: {
      annual_diesel_liters: totalDiesel,
      annual_electricity_kwh: totalKwh,
      annual_co2_tons: totalCo2,
      annual_fuel_cost_usd: totalFuelCost,
      annual_energy_cost_usd: totalEnergyCost,
      annual_maintenance_usd: totalMaintenance,
      annual_total_opex_usd: totalFuelCost + totalEnergyCost + totalMaintenance,
    },
    detail,
  }
}

// ─────────────────────────────────────────────────────────
// SECTION 2: ONSHORE — ELECTRIC FLEET (Scenario)
// ─────────────────────────────────────────────────────────
// Table used: equipment_electric_assumptions
//
// For each equipment type with qty > 0:
//   kwh          = annual_operating_hours × kwh_per_hour × qty
//   energy_cost  = kwh × energy_cost_per_kwh
//   co2_tons     = kwh × co2_kg_per_kwh / 1000
//   maintenance  = annual_maintenance_usd × qty
//   capex        = (unit_capex_usd + installation_cost_usd) × qty
// ─────────────────────────────────────────────────────────

export function calculateElectricFleet(
  equipment: Record<string, number>,
  electricAssumptions: ElectricAssumptionRow[],
): { totals: FleetMetrics; detail: EquipmentLineItem[]; totalCapex: number } {
  const detail: EquipmentLineItem[] = []
  let totalKwh = 0
  let totalCo2 = 0
  let totalEnergyCost = 0
  let totalMaintenance = 0
  let totalCapex = 0

  for (const [key, qty] of Object.entries(equipment)) {
    if (qty <= 0) continue

    const elec = electricAssumptions.find(a => a.equipment_key === key)
    if (!elec) continue

    // Formula: kWh = hours × kWh/hour × qty
    const annualKwh = elec.annual_operating_hours * elec.power_consumption_kwh_per_hour * qty
    // Formula: energy_cost = kWh × $/kWh
    const annualEnergyCost = annualKwh * elec.energy_cost_per_kwh
    // Formula: CO2 = kWh × kg_CO2/kWh ÷ 1000 → tons
    const annualCo2 = annualKwh * elec.co2_kg_per_kwh_grid / 1000
    const annualMaintenance = elec.annual_maintenance_usd * qty
    // Formula: CAPEX = (unit_cost + install_cost) × qty
    const unitCapex = (elec.unit_capex_usd + elec.installation_cost_usd) * qty

    totalKwh += annualKwh
    totalCo2 += annualCo2
    totalEnergyCost += annualEnergyCost
    totalMaintenance += annualMaintenance
    totalCapex += unitCapex

    detail.push({
      equipment_key: key,
      display_name: elec.display_name,
      equipment_type: elec.equipment_type,
      unit_label: elec.unit_label,
      quantity: qty,
      annual_diesel_liters: 0,
      annual_electricity_kwh: annualKwh,
      annual_co2_tons: annualCo2,
      annual_fuel_cost_usd: 0,
      annual_energy_cost_usd: annualEnergyCost,
      annual_maintenance_usd: annualMaintenance,
      annual_total_opex_usd: annualEnergyCost + annualMaintenance,
      unit_capex_usd: elec.unit_capex_usd + elec.installation_cost_usd,
      total_capex_usd: unitCapex,
      installation_cost_usd: elec.installation_cost_usd,
      lifespan_years: elec.lifespan_years,
    })
  }

  return {
    totals: {
      annual_diesel_liters: 0,
      annual_electricity_kwh: totalKwh,
      annual_co2_tons: totalCo2,
      annual_fuel_cost_usd: 0,
      annual_energy_cost_usd: totalEnergyCost,
      annual_maintenance_usd: totalMaintenance,
      annual_total_opex_usd: totalEnergyCost + totalMaintenance,
    },
    detail,
    totalCapex,
  }
}

// ─────────────────────────────────────────────────────────
// SECTION 3: OFFSHORE — Vessels at Berth + Tugboats
// ─────────────────────────────────────────────────────────
// Tables used: vessel_berth_assumptions, tugboat_assumptions
//
// VESSEL AT-BERTH (baseline):
//   For each vessel call entry:
//     diesel_L = annual_calls × avg_berth_hours × fuel_L/hr
//     co2      = diesel_L × co2_kg_per_liter_mdo / 1000
//     cost     = diesel_L × diesel_price (using default 1.40)
//
// VESSEL AT-BERTH (scenario with shore power):
//   shore_power_fraction = shore_power_connections / unique berths needed
//   For connected vessels:
//     shore_power_kwh = calls × berth_hours × shore_power_demand_kw × fraction
//     diesel_avoided  = calls × berth_hours × fuel_L/hr × fraction
//     remaining_diesel = baseline_diesel - diesel_avoided
//
// TUGBOATS:
//   total_vessel_calls = SUM(all vessel_calls[].annual_calls)
//   total_operations   = total_calls × operations_per_vessel_call × tug_count
//   diesel_tugs:  diesel_L = operations × fuel_L_per_operation
//   electric_tugs: kwh     = operations × kwh_per_operation
//   hybrid_tugs:   both diesel_L and kwh per operation
// ─────────────────────────────────────────────────────────

const DEFAULT_DIESEL_PRICE = 1.40
const DEFAULT_ELECTRICITY_PRICE = 0.12

export function calculateOffshore(
  vesselCalls: VesselCallConfig[],
  tugConfig: TugConfig,
  vesselAssumptions: VesselBerthRow[],
  tugAssumptions: TugboatAssumptionRow[],
  shorePowerConnections = 0,
): OffshoreMetrics {
  // ── Vessel at-berth calculations ──
  let vesselDiesel = 0
  let vesselCo2 = 0
  let vesselFuelCost = 0
  let shorePowerKwh = 0
  let shorePowerCost = 0
  let shorePowerCo2 = 0

  const totalAnnualCalls = vesselCalls.reduce((sum, vc) => sum + vc.annual_calls, 0)

  // Shore power fraction: what % of berth time can be served by shore power
  // Estimated by comparing shore power connections to the number of berths
  // needed to handle total annual berth-hours at typical utilization.
  //
  // Formula:
  //   total_berth_hours = Σ(annual_calls × avg_berth_hours) per vessel type
  //   estimated_berths  = ceil(total_berth_hours / (8760 × utilization))
  //   fraction          = min(connections / estimated_berths, 1.0)
  //
  // Uses 55% berth utilization — industry standard for container terminals
  // (PIANC Working Group guidelines suggest 50–60%).
  const BERTH_UTILIZATION = 0.55
  const HOURS_PER_YEAR = 8760

  let shorePowerFraction = 0
  if (shorePowerConnections > 0 && totalAnnualCalls > 0) {
    const totalBerthHoursDemand = vesselCalls.reduce((sum, vc) => {
      const assumption = vesselAssumptions.find(a => a.vessel_type === vc.vessel_type)
      if (!assumption || vc.annual_calls <= 0) return sum
      const berthHrs = vc.avg_berth_hours || assumption.avg_berth_hours
      return sum + vc.annual_calls * berthHrs
    }, 0)

    const estimatedBerths = Math.max(
      Math.ceil(totalBerthHoursDemand / (HOURS_PER_YEAR * BERTH_UTILIZATION)),
      1,
    )
    shorePowerFraction = Math.min(shorePowerConnections / estimatedBerths, 1.0)
  }

  for (const vc of vesselCalls) {
    const assumption = vesselAssumptions.find(a => a.vessel_type === vc.vessel_type)
    if (!assumption || vc.annual_calls <= 0) continue

    const berthHours = vc.avg_berth_hours || assumption.avg_berth_hours

    // Baseline diesel at berth (full, before shore power)
    // Formula: diesel_L = calls × berth_hours × L/hr
    const baselineDiesel = vc.annual_calls * berthHours * assumption.fuel_consumption_l_per_hour_at_berth

    if (shorePowerFraction > 0) {
      // Scenario: shore power replaces a fraction of at-berth diesel
      const dieselAvoided = baselineDiesel * shorePowerFraction
      const remainingDiesel = baselineDiesel - dieselAvoided

      vesselDiesel += remainingDiesel
      vesselCo2 += remainingDiesel * assumption.co2_kg_per_liter_mdo / 1000
      vesselFuelCost += remainingDiesel * DEFAULT_DIESEL_PRICE

      // Shore power kWh to replace the avoided diesel
      // Formula: kWh = calls × berth_hours × shore_power_demand_kw × fraction
      const spKwh = vc.annual_calls * berthHours * assumption.shore_power_demand_kw * shorePowerFraction
      shorePowerKwh += spKwh
      shorePowerCost += spKwh * DEFAULT_ELECTRICITY_PRICE
      // Grid CO2 for shore power (global avg 0.42 kg/kWh)
      shorePowerCo2 += spKwh * 0.42 / 1000
    } else {
      // No shore power — all diesel
      vesselDiesel += baselineDiesel
      vesselCo2 += baselineDiesel * assumption.co2_kg_per_liter_mdo / 1000
      vesselFuelCost += baselineDiesel * DEFAULT_DIESEL_PRICE
    }
  }

  // ── Tugboat calculations ──
  let tugDiesel = 0
  let tugKwh = 0
  let tugCo2 = 0
  let tugFuelCost = 0
  let tugEnergyCost = 0
  let tugMaintenance = 0
  let tugCapex = 0

  const tugAssumption = tugAssumptions.find(a => a.tug_type === tugConfig.type)
  if (tugAssumption && tugConfig.count > 0 && totalAnnualCalls > 0) {
    // Formula: total_operations = total_vessel_calls × ops_per_call × tug_count
    const totalOps = totalAnnualCalls * tugAssumption.operations_per_vessel_call * tugConfig.count

    // Diesel consumption (diesel and hybrid tugs)
    tugDiesel = totalOps * tugAssumption.fuel_consumption_l_per_operation
    tugFuelCost = tugDiesel * DEFAULT_DIESEL_PRICE
    const dieselCo2 = tugDiesel * tugAssumption.co2_kg_per_liter_diesel / 1000

    // Electric consumption (electric and hybrid tugs)
    tugKwh = totalOps * tugAssumption.power_consumption_kwh_per_operation
    tugEnergyCost = tugKwh * DEFAULT_ELECTRICITY_PRICE
    const elecCo2 = tugKwh * tugAssumption.co2_kg_per_kwh_grid / 1000

    tugCo2 = dieselCo2 + elecCo2
    tugMaintenance = tugAssumption.annual_maintenance_usd * tugConfig.count
    tugCapex = tugAssumption.unit_capex_usd * tugConfig.count
  }

  const totalDiesel = vesselDiesel + tugDiesel
  const totalCo2 = vesselCo2 + shorePowerCo2 + tugCo2
  const totalCost = vesselFuelCost + shorePowerCost + tugFuelCost + tugEnergyCost + tugMaintenance

  return {
    vessel_diesel_liters: vesselDiesel,
    vessel_co2_tons: vesselCo2,
    vessel_fuel_cost_usd: vesselFuelCost,
    shore_power_kwh: shorePowerKwh,
    shore_power_cost_usd: shorePowerCost,
    shore_power_co2_tons: shorePowerCo2,
    tug_diesel_liters: tugDiesel,
    tug_electricity_kwh: tugKwh,
    tug_co2_tons: tugCo2,
    tug_fuel_cost_usd: tugFuelCost,
    tug_energy_cost_usd: tugEnergyCost,
    tug_maintenance_usd: tugMaintenance,
    tug_capex_usd: tugCapex,
    total_diesel_liters: totalDiesel,
    total_co2_tons: totalCo2,
    total_cost_usd: totalCost,
  }
}

// ─────────────────────────────────────────────────────────
// SECTION 4: BENCHMARK — Throughput-Based Reference
// ─────────────────────────────────────────────────────────
// Table used: container_throughput_benchmarks
//
// Formulas:
//   energy  = annual_teu × energy_kwh_per_teu
//   diesel  = annual_teu × diesel_liters_per_teu
//   co2     = annual_teu × co2_tons_per_teu
//   opex    = annual_teu × avg_opex_usd_per_teu
//
// This provides a "sanity check" reference for the equipment-
// level calculation. If the equipment totals deviate significantly
// from the benchmark, it may indicate missing equipment or
// unusual operating conditions.
// ─────────────────────────────────────────────────────────

export function calculateBenchmark(
  annualTeu: number,
  sizeKey: string,
  benchmarks: ThroughputBenchmarkRow[],
): BenchmarkMetrics {
  const benchmark = benchmarks.find(b => b.port_size_key === sizeKey)

  if (!benchmark || annualTeu <= 0) {
    return {
      benchmark_energy_kwh: 0,
      benchmark_diesel_liters: 0,
      benchmark_co2_tons: 0,
      benchmark_opex_usd: 0,
    }
  }

  return {
    benchmark_energy_kwh: annualTeu * benchmark.energy_kwh_per_teu,
    benchmark_diesel_liters: annualTeu * benchmark.diesel_liters_per_teu,
    benchmark_co2_tons: annualTeu * benchmark.co2_tons_per_teu,
    benchmark_opex_usd: annualTeu * benchmark.avg_opex_usd_per_teu,
  }
}

// ─────────────────────────────────────────────────────────
// SECTION 5: TERMINAL — Orchestrates all per-terminal calcs
// ─────────────────────────────────────────────────────────

export function calculateTerminal(
  terminal: TerminalConfig,
  assumptions: AllAssumptions,
  portSizeKey: string,
): TerminalResult {
  // Onshore baseline: current diesel/conventional fleet
  const baselineOnshore = calculateDieselFleet(
    terminal.onshore.baseline_equipment,
    assumptions.dieselEquipment,
    assumptions.electricEquipment,
  )

  // Onshore scenario: target electrified fleet
  const scenarioOnshore = calculateElectricFleet(
    terminal.onshore.scenario_equipment,
    assumptions.electricEquipment,
  )

  // Offshore baseline: all diesel vessels at berth + diesel tugs, no shore power
  const offshoreBaseline = calculateOffshore(
    terminal.offshore.vessel_calls,
    terminal.offshore.baseline_tugs,
    assumptions.vesselBerth,
    assumptions.tugboat,
    0, // no shore power in baseline
  )

  // Offshore scenario: shore power (from onshore infra) + scenario tug config
  const offshoreScenario = calculateOffshore(
    terminal.offshore.vessel_calls,
    terminal.offshore.scenario_tugs,
    assumptions.vesselBerth,
    assumptions.tugboat,
    terminal.onshore.shore_power_connections,
  )

  // Throughput benchmark reference
  const benchmark = calculateBenchmark(
    terminal.onshore.annual_teu,
    portSizeKey,
    assumptions.benchmarks,
  )

  // ── Transition CAPEX ──
  // Only charge CAPEX for equipment that is genuinely transitioning:
  //   1. Diesel→electric conversions: full CAPEX for all scenario units
  //      (replacing existing diesel equipment with electric equivalents)
  //   2. Already-electric equipment: CAPEX only for units ABOVE baseline count
  //      (existing electric units don't need to be re-purchased)
  //   3. Tug CAPEX: always a transition cost (diesel → electric/hybrid)
  let transitionCapex = 0
  for (const [key, scenarioQty] of Object.entries(terminal.onshore.scenario_equipment)) {
    if (scenarioQty <= 0) continue

    const elec = assumptions.electricEquipment.find(a => a.equipment_key === key)
    if (!elec) continue

    const baselineQty = terminal.onshore.baseline_equipment[key] || 0
    const dieselRow = assumptions.dieselEquipment.find(a => a.equipment_key === key)

    if (dieselRow && dieselRow.fuel_consumption_l_per_hour > 0) {
      // Diesel→electric: charge full CAPEX for all scenario units
      transitionCapex += (elec.unit_capex_usd + elec.installation_cost_usd) * scenarioQty
    } else {
      // Already-electric: only charge for units above baseline count
      const additionalUnits = Math.max(scenarioQty - baselineQty, 0)
      transitionCapex += (elec.unit_capex_usd + elec.installation_cost_usd) * additionalUnits
    }
  }

  const scenarioCapex = transitionCapex + offshoreScenario.tug_capex_usd

  return {
    terminal_id: terminal.id,
    terminal_name: terminal.name,
    onshore_baseline: baselineOnshore.totals,
    onshore_scenario: scenarioOnshore.totals,
    offshore_baseline: offshoreBaseline,
    offshore_scenario: offshoreScenario,
    benchmark,
    scenario_capex_usd: scenarioCapex,
    baseline_equipment_detail: baselineOnshore.detail,
    scenario_equipment_detail: scenarioOnshore.detail,
  }
}

// ─────────────────────────────────────────────────────────
// SECTION 6: PORT — Top-level orchestrator + aggregation
// ─────────────────────────────────────────────────────────
// Aggregates all terminal results into port-wide totals
// and computes the delta (baseline vs scenario).
// ─────────────────────────────────────────────────────────

export function calculatePort(
  request: CalculationRequest,
  assumptions: AllAssumptions,
): PortResult {
  const terminalResults = request.terminals.map(t =>
    calculateTerminal(t, assumptions, request.port.size_key)
  )

  // ── Aggregate baseline totals across all terminals ──
  let bDiesel = 0, bKwh = 0, bCo2 = 0, bOpex = 0
  let sDiesel = 0, sKwh = 0, sCo2 = 0, sOpex = 0
  let totalCapex = 0

  for (const tr of terminalResults) {
    // Baseline: onshore + offshore
    bDiesel += tr.onshore_baseline.annual_diesel_liters + tr.offshore_baseline.total_diesel_liters
    bKwh += tr.onshore_baseline.annual_electricity_kwh + tr.offshore_baseline.shore_power_kwh + tr.offshore_baseline.tug_electricity_kwh
    bCo2 += tr.onshore_baseline.annual_co2_tons + tr.offshore_baseline.total_co2_tons
    bOpex += tr.onshore_baseline.annual_total_opex_usd + tr.offshore_baseline.total_cost_usd

    // Scenario: onshore + offshore
    sDiesel += tr.onshore_scenario.annual_diesel_liters + tr.offshore_scenario.total_diesel_liters
    sKwh += tr.onshore_scenario.annual_electricity_kwh + tr.offshore_scenario.shore_power_kwh + tr.offshore_scenario.tug_electricity_kwh
    sCo2 += tr.onshore_scenario.annual_co2_tons + tr.offshore_scenario.total_co2_tons
    sOpex += tr.onshore_scenario.annual_total_opex_usd + tr.offshore_scenario.total_cost_usd

    totalCapex += tr.scenario_capex_usd
  }

  // ── Delta: baseline − scenario ──
  const dieselSaved = bDiesel - sDiesel
  const co2Saved = bCo2 - sCo2
  const annualOpexDelta = sOpex - bOpex // positive = scenario costs more
  const annualSavings = -annualOpexDelta // positive = scenario saves money

  const delta: DeltaMetrics = {
    diesel_liters_saved: dieselSaved,
    electricity_kwh_delta: sKwh - bKwh,
    co2_tons_saved: co2Saved,
    annual_opex_delta_usd: annualOpexDelta,
    total_capex_required_usd: totalCapex,
    // Payback = CAPEX / annual OPEX savings (only if scenario saves money)
    simple_payback_years: annualSavings > 0 ? totalCapex / annualSavings : null,
  }

  const totals: AggregatedTotals = {
    baseline_diesel_liters: bDiesel,
    baseline_electricity_kwh: bKwh,
    baseline_co2_tons: bCo2,
    baseline_total_opex_usd: bOpex,
    scenario_diesel_liters: sDiesel,
    scenario_electricity_kwh: sKwh,
    scenario_co2_tons: sCo2,
    scenario_total_opex_usd: sOpex,
    total_capex_usd: totalCapex,
    delta,
  }

  return {
    port: request.port,
    terminals: terminalResults,
    totals,
  }
}
