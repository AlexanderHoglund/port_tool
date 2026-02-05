/**
 * PIECE Calculation Engine
 *
 * Implements the PIECE (Port Infrastructure for Electric & Clean Energy) tool logic.
 * Key differences from original engine:
 * - Throughput-based: kWh/TEU × throughput instead of hours × kWh/hr
 * - Multi-terminal types: Container, Cruise, RoRo, Port Services
 * - Berth-by-berth OPS/DC configuration
 * - Charger infrastructure with sharing factors (EVSE)
 * - Grid infrastructure modeling
 */

import type {
  PieceTerminalConfig,
  PieceCalculationRequest,
  PieceAssumptions,
  PieceEquipmentRow,
  PieceEvseRow,
  PieceFleetOpsRow,
  PieceGridRow,
  EconomicAssumptionRow,
  PieceEquipmentLineItem,
  PieceChargerLineItem,
  PieceBerthLineItem,
  PieceGridResult,
  PieceTerminalResult,
  PiecePortResult,
  BerthConfig,
} from './types'

// ═══════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════

/**
 * Get economic assumption value by key, with fallback
 */
function getEconomicValue(
  assumptions: EconomicAssumptionRow[],
  key: string,
  fallback: number
): number {
  const row = assumptions.find((a) => a.assumption_key === key)
  return row?.value ?? fallback
}

/**
 * Build a lookup map from economic assumptions
 */
function buildEconomicMap(
  assumptions: EconomicAssumptionRow[],
  overrides?: Record<string, number>
): Record<string, number> {
  const map: Record<string, number> = {}
  for (const a of assumptions) {
    map[a.assumption_key] = overrides?.[a.assumption_key] ?? a.value
  }
  return map
}

// ═══════════════════════════════════════════════════════════
// EQUIPMENT CALCULATIONS (Throughput-Based)
// ═══════════════════════════════════════════════════════════

/**
 * Calculate equipment energy/emissions using PIECE throughput method
 *
 * PIECE Formula (for most equipment):
 *   annual_kwh = (kwh_per_teu × annual_teu) / teu_ratio × quantity
 *   annual_diesel_L = (liters_per_teu × annual_teu) / teu_ratio × quantity
 *
 * REEFER EXCEPTION: Uses capacity-based formula instead:
 *   annual_kwh = quantity × peak_power_kw × utilization_hours_per_year
 *   (Reefers provide constant power to refrigerated containers, not per-move energy)
 *
 * CRITICAL: Equipment category determines energy source:
 *   - grid_powered (STS, RMG, RTG, ASC, MHC, Reefer): electricity in BOTH baseline AND scenario
 *   - battery_powered (AGV, TT, ECH, RS, SC): diesel in baseline, electricity in scenario
 *
 * @param isScenario - true for electrified scenario, false for baseline
 */
export function calculateEquipmentPiece(
  equipmentCounts: Record<string, number>,
  annualTeu: number,
  pieceEquipment: PieceEquipmentRow[],
  economicMap: Record<string, number>,
  isScenario: boolean
): {
  lineItems: PieceEquipmentLineItem[]
  totals: {
    total_diesel_liters: number
    total_kwh: number
    total_co2_tons: number
    total_opex_usd: number
    total_capex_usd: number
  }
} {
  const dieselPrice = economicMap['diesel_price'] ?? 1.23
  const electricityPrice = economicMap['electricity_price'] ?? 0.12
  const dieselEfWtw = economicMap['diesel_ef_wtw'] ?? 3.29 // kgCO2e/L WTW
  const gridEf = economicMap['grid_ef'] ?? 0 // kgCO2/kWh (0 = 100% green)
  const maintenanceSaving = economicMap['maintenance_saving'] ?? 0.25
  const utilizationFactor = economicMap['utilization_factor'] ?? 0.85 // For capacity-based equipment

  // Reefer utilization is typically lower (containers come and go)
  const reeferUtilization = economicMap['reefer_utilization'] ?? 0.55
  const hoursPerYear = 8760

  const lineItems: PieceEquipmentLineItem[] = []
  let totalDiesel = 0
  let totalKwh = 0
  let totalCo2 = 0
  let totalOpex = 0
  let totalCapex = 0

  for (const [equipmentKey, quantity] of Object.entries(equipmentCounts)) {
    if (quantity <= 0) continue

    const meta = pieceEquipment.find((e) => e.equipment_key === equipmentKey)
    if (!meta) continue

    // Determine calculation method based on equipment type
    // REEFER: Uses capacity-based formula (power × utilization × hours)
    // OTHERS: Use throughput-based formula (kWh/TEU × TEU / ratio)
    let annualKwhPotential: number
    let annualDieselPotential: number

    if (equipmentKey === 'reefer') {
      // Reefer capacity-based: plugs × power × utilization × hours
      annualKwhPotential = quantity * meta.peak_power_kw * reeferUtilization * hoursPerYear
      annualDieselPotential = 0 // Reefers are always electric
    } else {
      // Standard throughput-based formula
      // TEU ratio: how many TEU moves one unit handles (e.g., STS=1, RTG=4, TT=8)
      annualKwhPotential = (meta.kwh_per_teu * annualTeu) / meta.teu_ratio * quantity
      annualDieselPotential = (meta.liters_per_teu * annualTeu) / meta.teu_ratio * quantity
    }

    // CRITICAL: Determine energy source based on equipment category
    // Grid-powered: ALWAYS uses electricity (both baseline and scenario)
    // Battery-powered: diesel in baseline, electricity in scenario
    const isGridPowered = meta.equipment_category === 'grid_powered'
    const usesElectricity = isGridPowered || isScenario
    const usesDiesel = !isGridPowered && !isScenario

    const annualKwh = usesElectricity ? annualKwhPotential : 0
    const annualDieselL = usesDiesel ? annualDieselPotential : 0

    // CO2 emissions
    let co2Kg = 0
    if (usesElectricity) {
      co2Kg = annualKwh * gridEf
    } else if (usesDiesel) {
      co2Kg = annualDieselL * dieselEfWtw
    }
    const co2Tons = co2Kg / 1000

    // Costs
    const fuelCost = annualDieselL * dieselPrice
    const energyCost = usesElectricity ? annualKwh * electricityPrice : 0

    // Maintenance
    // Grid-powered: same maintenance in both scenarios
    // Battery-powered in scenario: saves ~25% on maintenance
    const baseMaintenance = meta.annual_opex_usd * quantity
    const maintenanceCost = !isGridPowered && isScenario
      ? baseMaintenance * (1 - maintenanceSaving)
      : baseMaintenance

    const totalOpexItem = fuelCost + energyCost + maintenanceCost

    // CAPEX
    // Grid-powered: no additional CAPEX (already electric)
    // Battery-powered in scenario: CAPEX for new electric equipment
    const unitCapex = !isGridPowered && isScenario ? meta.capex_usd : 0
    const totalItemCapex = unitCapex * quantity

    const lineItem: PieceEquipmentLineItem = {
      equipment_key: equipmentKey,
      display_name: meta.display_name,
      equipment_category: meta.equipment_category,
      equipment_type: meta.equipment_type,
      quantity,
      kwh_per_teu: meta.kwh_per_teu,
      teu_ratio: meta.teu_ratio,
      annual_kwh: annualKwh,
      annual_diesel_liters: annualDieselL,
      annual_co2_tons: co2Tons,
      annual_energy_cost_usd: energyCost,
      annual_fuel_cost_usd: fuelCost,
      annual_maintenance_usd: maintenanceCost,
      annual_total_opex_usd: totalOpexItem,
      unit_capex_usd: unitCapex,
      total_capex_usd: totalItemCapex,
      lifespan_years: meta.lifespan_years,
    }

    lineItems.push(lineItem)

    totalDiesel += annualDieselL
    totalKwh += annualKwh
    totalCo2 += co2Tons
    totalOpex += totalOpexItem
    totalCapex += totalItemCapex
  }

  return {
    lineItems,
    totals: {
      total_diesel_liters: totalDiesel,
      total_kwh: totalKwh,
      total_co2_tons: totalCo2,
      total_opex_usd: totalOpex,
      total_capex_usd: totalCapex,
    },
  }
}

// ═══════════════════════════════════════════════════════════
// CHARGER CALCULATIONS (EVSE with Sharing Factors)
// ═══════════════════════════════════════════════════════════

/**
 * Calculate required chargers based on equipment counts + sharing factors
 *
 * PIECE uses "units per charger" - how many equipment units share one charger
 * e.g., 15 AGVs share 1 charger, 5 ECHs share 1 charger
 */
export function calculateChargers(
  equipmentCounts: Record<string, number>,
  evseData: PieceEvseRow[],
  chargerOverrides?: Record<string, number>
): {
  lineItems: PieceChargerLineItem[]
  totals: {
    total_chargers: number
    total_power_kw: number
    total_capex_usd: number
    total_annual_opex_usd: number
  }
} {
  const lineItems: PieceChargerLineItem[] = []
  let totalChargers = 0
  let totalPowerKw = 0
  let totalCapex = 0
  let totalOpex = 0

  for (const evse of evseData) {
    const equipmentCount = equipmentCounts[evse.equipment_key] ?? 0
    if (equipmentCount <= 0) continue

    // Calculate required chargers (ceiling division)
    const chargersRequired = Math.ceil(equipmentCount / evse.units_per_charger)

    // Allow manual override
    const chargersFinal = chargerOverrides?.[evse.evse_key] ?? chargersRequired

    const itemTotalPower = evse.power_kw * chargersFinal
    const itemTotalCapex = evse.capex_usd * chargersFinal
    const itemTotalOpex = evse.annual_opex_usd * chargersFinal

    const lineItem: PieceChargerLineItem = {
      evse_key: evse.evse_key,
      display_name: evse.display_name,
      equipment_key: evse.equipment_key,
      equipment_count: equipmentCount,
      units_per_charger: evse.units_per_charger,
      chargers_required: chargersRequired,
      chargers_override: chargerOverrides?.[evse.evse_key],
      chargers_final: chargersFinal,
      power_kw: evse.power_kw,
      total_power_kw: itemTotalPower,
      capex_usd: evse.capex_usd,
      total_capex_usd: itemTotalCapex,
      annual_opex_usd: evse.annual_opex_usd,
      total_annual_opex_usd: itemTotalOpex,
    }

    lineItems.push(lineItem)

    totalChargers += chargersFinal
    totalPowerKw += itemTotalPower
    totalCapex += itemTotalCapex
    totalOpex += itemTotalOpex
  }

  return {
    lineItems,
    totals: {
      total_chargers: totalChargers,
      total_power_kw: totalPowerKw,
      total_capex_usd: totalCapex,
      total_annual_opex_usd: totalOpex,
    },
  }
}

// ═══════════════════════════════════════════════════════════
// BERTH / OPS CALCULATIONS
// ═══════════════════════════════════════════════════════════

/**
 * Calculate OPS/DC infrastructure and emissions for all berths
 *
 * For each berth:
 * - Baseline: All vessels run on diesel at berth
 * - Scenario: OPS-enabled berths use shore power, others use diesel
 */
export function calculateBerthInfrastructure(
  berths: BerthConfig[],
  fleetOps: PieceFleetOpsRow[],
  economicMap: Record<string, number>
): {
  lineItems: PieceBerthLineItem[]
  totals: {
    total_ops_capex_usd: number
    total_ops_opex_usd: number
    total_ops_peak_mw: number
    baseline_diesel_liters: number
    baseline_co2_tons: number
    baseline_fuel_cost_usd: number
    scenario_diesel_liters: number
    scenario_shore_power_kwh: number
    scenario_co2_tons: number
    scenario_cost_usd: number
  }
} {
  const dieselPrice = economicMap['diesel_price'] ?? 1.23
  const electricityPrice = economicMap['electricity_price'] ?? 0.12
  const dieselEfWtw = economicMap['diesel_ef_wtw'] ?? 3.29
  const gridEf = economicMap['grid_ef'] ?? 0
  const dieselEnergyDensity = economicMap['diesel_energy_density'] ?? 9.7 // kWh/L
  const engineEfficiency = economicMap['engine_efficiency'] ?? 0.45 // diesel engine efficiency

  // Vessel fuel consumption at berth (from PIECE data)
  // This is per-hour fuel consumption for auxiliary engines
  const vesselFuelPerHour = economicMap['vessel_fuel_l_per_hour'] ?? 200

  // Calculate diesel-to-electric conversion factor
  // Shore power should match the USEFUL work from diesel, not the raw energy
  // 1L diesel → dieselEnergyDensity kWh energy → engineEfficiency useful work
  // Electric motors are ~95% efficient, so shore power needed ≈ useful work / 0.95
  const dieselToElectricKwhPerL = dieselEnergyDensity * engineEfficiency / 0.95

  const lineItems: PieceBerthLineItem[] = []
  let totalOpsCapex = 0
  let totalOpsOpex = 0
  let totalOpsPeakMw = 0
  let totalBaselineDiesel = 0
  let totalBaselineCo2 = 0
  let totalBaselineFuelCost = 0
  let totalScenarioDiesel = 0
  let totalScenarioShorePower = 0
  let totalScenarioCo2 = 0
  let totalScenarioCost = 0

  for (const berth of berths) {
    const fleetRow = fleetOps.find(
      (f) => f.vessel_segment_key === berth.vessel_segment_key
    )

    // Default values if segment not found
    const opsPowerMw = fleetRow?.ops_power_mw ?? 2.0
    const transformerCapex = fleetRow?.transformer_capex_usd ?? 350000
    const converterCapex = fleetRow?.converter_capex_usd ?? 280000
    const civilWorksCapex = fleetRow?.civil_works_capex_usd ?? 124000
    const opsAnnualOpex = fleetRow?.annual_opex_usd ?? 10000

    // Total OPS CAPEX for this berth (if OPS enabled)
    const berth_ops_capex = berth.ops_enabled
      ? transformerCapex + converterCapex + civilWorksCapex
      : 0

    // Annual berth hours
    const annualBerthHours = berth.annual_calls * berth.avg_berth_hours

    // Baseline: All diesel
    const baselineDieselL = annualBerthHours * vesselFuelPerHour
    const baselineCo2Tons = (baselineDieselL * dieselEfWtw) / 1000
    const baselineFuelCost = baselineDieselL * dieselPrice

    // Scenario: OPS or diesel
    let scenarioDieselL = 0
    let scenarioShorePowerKwh = 0
    let scenarioCo2Tons = 0
    let scenarioFuelCost = 0
    let scenarioEnergyCost = 0

    if (berth.ops_enabled) {
      // Shore power replaces vessel auxiliary diesel consumption
      // Calculate kWh equivalent to the diesel that would be burned
      // This ensures proper cost comparison: diesel cost vs electricity cost for SAME work
      scenarioShorePowerKwh = baselineDieselL * dieselToElectricKwhPerL
      scenarioCo2Tons = (scenarioShorePowerKwh * gridEf) / 1000
      scenarioEnergyCost = scenarioShorePowerKwh * electricityPrice
    } else {
      // Still diesel
      scenarioDieselL = baselineDieselL
      scenarioCo2Tons = baselineCo2Tons
      scenarioFuelCost = baselineFuelCost
    }

    const lineItem: PieceBerthLineItem = {
      berth_id: berth.id,
      berth_name: berth.berth_name,
      berth_number: berth.berth_number,
      vessel_segment_key: berth.vessel_segment_key,
      vessel_segment_name: fleetRow?.display_name ?? berth.vessel_segment_key,
      annual_calls: berth.annual_calls,
      avg_berth_hours: berth.avg_berth_hours,
      ops_enabled: berth.ops_enabled,
      dc_enabled: berth.dc_enabled,
      ops_power_mw: opsPowerMw,
      ops_transformer_capex_usd: berth.ops_enabled ? transformerCapex : 0,
      ops_converter_capex_usd: berth.ops_enabled ? converterCapex : 0,
      ops_civil_works_capex_usd: berth.ops_enabled ? civilWorksCapex : 0,
      ops_total_capex_usd: berth_ops_capex,
      ops_annual_opex_usd: berth.ops_enabled ? opsAnnualOpex : 0,
      baseline_berth_hours: annualBerthHours,
      baseline_diesel_liters: baselineDieselL,
      baseline_co2_tons: baselineCo2Tons,
      baseline_fuel_cost_usd: baselineFuelCost,
      scenario_diesel_liters: scenarioDieselL,
      scenario_shore_power_kwh: scenarioShorePowerKwh,
      scenario_co2_tons: scenarioCo2Tons,
      scenario_fuel_cost_usd: scenarioFuelCost,
      scenario_energy_cost_usd: scenarioEnergyCost,
    }

    lineItems.push(lineItem)

    // Accumulate totals
    if (berth.ops_enabled) {
      totalOpsCapex += berth_ops_capex
      totalOpsOpex += opsAnnualOpex
      totalOpsPeakMw += opsPowerMw
    }
    totalBaselineDiesel += baselineDieselL
    totalBaselineCo2 += baselineCo2Tons
    totalBaselineFuelCost += baselineFuelCost
    totalScenarioDiesel += scenarioDieselL
    totalScenarioShorePower += scenarioShorePowerKwh
    totalScenarioCo2 += scenarioCo2Tons
    totalScenarioCost += scenarioFuelCost + scenarioEnergyCost
  }

  return {
    lineItems,
    totals: {
      total_ops_capex_usd: totalOpsCapex,
      total_ops_opex_usd: totalOpsOpex,
      total_ops_peak_mw: totalOpsPeakMw,
      baseline_diesel_liters: totalBaselineDiesel,
      baseline_co2_tons: totalBaselineCo2,
      baseline_fuel_cost_usd: totalBaselineFuelCost,
      scenario_diesel_liters: totalScenarioDiesel,
      scenario_shore_power_kwh: totalScenarioShorePower,
      scenario_co2_tons: totalScenarioCo2,
      scenario_cost_usd: totalScenarioCost,
    },
  }
}

// ═══════════════════════════════════════════════════════════
// GRID INFRASTRUCTURE CALCULATIONS
// ═══════════════════════════════════════════════════════════

/**
 * Calculate grid infrastructure requirements
 *
 * Total peak demand = equipment + OPS + EVSE (with simultaneity factor)
 * Substation and cabling sized to meet this demand
 */
export function calculateGridInfra(
  equipmentPeakMw: number,
  opsPeakMw: number,
  evsePeakMw: number,
  cableLengthM: number,
  gridData: PieceGridRow[]
): PieceGridResult {
  const grossPeakMw = equipmentPeakMw + opsPeakMw + evsePeakMw

  // Get simultaneity factor (typically 0.8-0.9)
  const simultaneityRow = gridData.find((g) =>
    g.component_key.includes('simultaneity')
  )
  const simultaneityFactor = simultaneityRow?.simultaneity_factor ?? 0.8

  const netPeakMw = grossPeakMw * simultaneityFactor

  // Determine substation size/type based on demand
  let substationType = 'substation_11kv'
  let substationCostPerMw = 200000

  if (netPeakMw > 30) {
    const sub110 = gridData.find((g) => g.component_key === 'substation_110kv')
    substationType = 'substation_110kv'
    substationCostPerMw = sub110?.cost_per_mw ?? 240000
  } else if (netPeakMw > 10) {
    const sub33 = gridData.find((g) => g.component_key === 'substation_33kv')
    substationType = 'substation_33kv'
    substationCostPerMw = sub33?.cost_per_mw ?? 230000
  } else {
    const sub11 = gridData.find((g) => g.component_key === 'substation_11kv')
    substationType = 'substation_11kv'
    substationCostPerMw = sub11?.cost_per_mw ?? 200000
  }

  const substationCapex = substationCostPerMw * netPeakMw

  // Determine cable type and cost
  let cableType = 'cable_11kv_3core'
  let cableCostPerMeter = 90

  if (netPeakMw > 20) {
    const cable33 = gridData.find(
      (g) => g.component_key === 'cable_33kv_3x1core'
    )
    cableType = 'cable_33kv_3x1core'
    cableCostPerMeter = cable33?.cost_per_meter ?? 150
  } else {
    const cable11 = gridData.find((g) => g.component_key === 'cable_11kv_3core')
    cableType = 'cable_11kv_3core'
    cableCostPerMeter = cable11?.cost_per_meter ?? 90
  }

  const cableCapex = cableCostPerMeter * cableLengthM

  return {
    total_equipment_peak_mw: equipmentPeakMw,
    total_ops_peak_mw: opsPeakMw,
    total_evse_peak_mw: evsePeakMw,
    gross_peak_demand_mw: grossPeakMw,
    simultaneity_factor: simultaneityFactor,
    net_peak_demand_mw: netPeakMw,
    substation_type: substationType,
    substation_capex_usd: substationCapex,
    cable_length_m: cableLengthM,
    cable_type: cableType,
    cable_capex_usd: cableCapex,
    total_grid_capex_usd: substationCapex + cableCapex,
  }
}

// ═══════════════════════════════════════════════════════════
// TERMINAL-LEVEL CALCULATION
// ═══════════════════════════════════════════════════════════

/**
 * Calculate full terminal results using PIECE methodology
 */
export function calculateTerminalPiece(
  terminal: PieceTerminalConfig,
  assumptions: PieceAssumptions,
  economicMap: Record<string, number>
): PieceTerminalResult {
  // Filter equipment to this terminal type
  const terminalEquipment = assumptions.equipment.filter(
    (e) => e.terminal_type_key === terminal.terminal_type
  )

  // ── Baseline Equipment ──
  // Grid-powered: uses electricity (STS, RMG, RTG, ASC, MHC, Reefer are already electric)
  // Battery-powered: uses diesel (AGV, TT, ECH, RS, SC are diesel-powered today)
  const baselineResult = calculateEquipmentPiece(
    terminal.baseline_equipment,
    terminal.annual_teu,
    terminalEquipment,
    economicMap,
    false // baseline scenario
  )

  // ── Scenario Equipment (electrified fleet) ──
  // Grid-powered: uses electricity (same as baseline - no change)
  // Battery-powered: now uses electricity (transitioned from diesel to electric)
  const scenarioResult = calculateEquipmentPiece(
    terminal.scenario_equipment,
    terminal.annual_teu,
    terminalEquipment,
    economicMap,
    true // electrified scenario
  )

  // ── Chargers (scenario only, for battery-powered equipment) ──
  // Filter to battery-powered equipment only
  const batteryEquipmentKeys = terminalEquipment
    .filter((e) => e.equipment_category === 'battery_powered')
    .map((e) => e.equipment_key)

  const batteryEquipmentCounts: Record<string, number> = {}
  for (const key of batteryEquipmentKeys) {
    if (terminal.scenario_equipment[key] > 0) {
      batteryEquipmentCounts[key] = terminal.scenario_equipment[key]
    }
  }

  const chargerResult = calculateChargers(
    batteryEquipmentCounts,
    assumptions.evse,
    terminal.charger_overrides
  )

  // ── Berths / OPS ──
  const berthResult = calculateBerthInfrastructure(
    terminal.berths,
    assumptions.fleetOps,
    economicMap
  )

  // ── Grid Infrastructure ──
  // Calculate peak power from scenario equipment
  let equipmentPeakKw = 0
  for (const [key, qty] of Object.entries(terminal.scenario_equipment)) {
    const meta = terminalEquipment.find((e) => e.equipment_key === key)
    if (meta && qty > 0) {
      equipmentPeakKw += meta.peak_power_kw * qty
    }
  }
  const equipmentPeakMw = equipmentPeakKw / 1000

  const gridResult = calculateGridInfra(
    equipmentPeakMw,
    berthResult.totals.total_ops_peak_mw,
    chargerResult.totals.total_power_kw / 1000,
    terminal.cable_length_m ?? 500, // Default 500m
    assumptions.grid
  )

  // ── Total OPEX/CAPEX ──
  const totalBaselineOpex =
    baselineResult.totals.total_opex_usd + berthResult.totals.baseline_fuel_cost_usd

  const totalScenarioOpex =
    scenarioResult.totals.total_opex_usd +
    chargerResult.totals.total_annual_opex_usd +
    berthResult.totals.scenario_cost_usd +
    berthResult.totals.total_ops_opex_usd

  const totalCapex =
    scenarioResult.totals.total_capex_usd +
    chargerResult.totals.total_capex_usd +
    berthResult.totals.total_ops_capex_usd +
    gridResult.total_grid_capex_usd

  // ── CO2 Savings ──
  const baselineCo2 =
    baselineResult.totals.total_co2_tons + berthResult.totals.baseline_co2_tons
  const scenarioCo2 =
    scenarioResult.totals.total_co2_tons + berthResult.totals.scenario_co2_tons

  return {
    terminal_id: terminal.id,
    terminal_name: terminal.name,
    terminal_type: terminal.terminal_type,
    annual_throughput: terminal.annual_teu,

    baseline_equipment: baselineResult.lineItems,
    baseline_totals: {
      total_diesel_liters: baselineResult.totals.total_diesel_liters,
      total_kwh: baselineResult.totals.total_kwh,
      total_co2_tons: baselineResult.totals.total_co2_tons,
      total_opex_usd: baselineResult.totals.total_opex_usd,
    },

    scenario_equipment: scenarioResult.lineItems,
    scenario_totals: {
      total_diesel_liters: scenarioResult.totals.total_diesel_liters,
      total_kwh: scenarioResult.totals.total_kwh,
      total_co2_tons: scenarioResult.totals.total_co2_tons,
      total_opex_usd: scenarioResult.totals.total_opex_usd,
      total_equipment_capex_usd: scenarioResult.totals.total_capex_usd,
    },

    chargers: chargerResult.lineItems,
    charger_totals: chargerResult.totals,

    berths: berthResult.lineItems,
    berth_totals: berthResult.totals,

    grid: gridResult,

    total_baseline_opex_usd: totalBaselineOpex,
    total_scenario_opex_usd: totalScenarioOpex,
    total_capex_usd: totalCapex,
    annual_opex_savings_usd: totalBaselineOpex - totalScenarioOpex,
    annual_co2_savings_tons: baselineCo2 - scenarioCo2,
  }
}

// ═══════════════════════════════════════════════════════════
// PORT-LEVEL CALCULATION
// ═══════════════════════════════════════════════════════════

/**
 * Calculate full port results (all terminals aggregated)
 */
export function calculatePortPiece(
  request: PieceCalculationRequest,
  assumptions: PieceAssumptions
): PiecePortResult {
  // Build economic map with any overrides
  const economicMap = buildEconomicMap(
    assumptions.economic,
    request.economic_overrides
  )

  // Calculate each terminal
  const terminalResults: PieceTerminalResult[] = request.terminals.map((t) =>
    calculateTerminalPiece(t, assumptions, economicMap)
  )

  // Aggregate totals
  let baselineDiesel = 0
  let baselineKwh = 0
  let baselineCo2 = 0
  let baselineOpex = 0
  let scenarioDiesel = 0
  let scenarioKwh = 0
  let scenarioCo2 = 0
  let scenarioOpex = 0
  let equipmentCapex = 0
  let chargerCapex = 0
  let opsCapex = 0
  let gridCapex = 0

  for (const tr of terminalResults) {
    baselineDiesel += tr.baseline_totals.total_diesel_liters
    baselineDiesel += tr.berth_totals.baseline_diesel_liters
    baselineKwh += tr.baseline_totals.total_kwh
    baselineCo2 += tr.baseline_totals.total_co2_tons + tr.berth_totals.baseline_co2_tons
    baselineOpex += tr.total_baseline_opex_usd

    scenarioDiesel += tr.scenario_totals.total_diesel_liters
    scenarioDiesel += tr.berth_totals.scenario_diesel_liters
    scenarioKwh += tr.scenario_totals.total_kwh + tr.berth_totals.scenario_shore_power_kwh
    scenarioCo2 += tr.scenario_totals.total_co2_tons + tr.berth_totals.scenario_co2_tons
    scenarioOpex += tr.total_scenario_opex_usd

    equipmentCapex += tr.scenario_totals.total_equipment_capex_usd
    chargerCapex += tr.charger_totals.total_capex_usd
    opsCapex += tr.berth_totals.total_ops_capex_usd
    gridCapex += tr.grid.total_grid_capex_usd
  }

  const totalCapex = equipmentCapex + chargerCapex + opsCapex + gridCapex
  const dieselSaved = baselineDiesel - scenarioDiesel
  const co2Saved = baselineCo2 - scenarioCo2
  const co2ReductionPercent = baselineCo2 > 0 ? (co2Saved / baselineCo2) * 100 : 0
  const annualOpexSavings = baselineOpex - scenarioOpex

  // Simple payback
  const simplePayback =
    annualOpexSavings > 0 ? totalCapex / annualOpexSavings : null

  return {
    port: request.port,
    terminals: terminalResults,
    totals: {
      baseline_diesel_liters: baselineDiesel,
      baseline_kwh: baselineKwh,
      baseline_co2_tons: baselineCo2,
      baseline_opex_usd: baselineOpex,

      scenario_diesel_liters: scenarioDiesel,
      scenario_kwh: scenarioKwh,
      scenario_co2_tons: scenarioCo2,
      scenario_opex_usd: scenarioOpex,

      equipment_capex_usd: equipmentCapex,
      charger_capex_usd: chargerCapex,
      ops_capex_usd: opsCapex,
      grid_capex_usd: gridCapex,
      total_capex_usd: totalCapex,

      diesel_liters_saved: dieselSaved,
      co2_tons_saved: co2Saved,
      co2_reduction_percent: co2ReductionPercent,
      annual_opex_savings_usd: annualOpexSavings,
      simple_payback_years: simplePayback,
    },
    economic_assumptions_used: economicMap,
  }
}
