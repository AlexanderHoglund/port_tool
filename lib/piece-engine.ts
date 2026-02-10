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
  BerthDefinition,
  BerthScenarioConfig,
  BaselineEquipmentEntry,
  ScenarioEquipmentEntry,
} from './types'

// ═══════════════════════════════════════════════════════════
// TYPE CONVERSION HELPERS
// ═══════════════════════════════════════════════════════════

/**
 * Convert BaselineEquipmentEntry to separate diesel and electric counts.
 * ALL equipment types (grid_powered AND battery_powered) can have both diesel and electric variants.
 * For example, a terminal may have 65 diesel RTGs + 1 electric RTG.
 */
function getBaselineSplitCounts(
  equipment: Record<string, BaselineEquipmentEntry>,
): { diesel: Record<string, number>; electric: Record<string, number> } {
  const diesel: Record<string, number> = {}
  const electric: Record<string, number> = {}
  for (const [key, entry] of Object.entries(equipment)) {
    diesel[key] = entry.existing_diesel
    electric[key] = entry.existing_electric
  }
  return { diesel, electric }
}

/**
 * Convert to scenario split counts.
 * Scenario converts diesel → electric. Any equipment type can be converted.
 * Returns remaining diesel and total electric (existing + converted + new).
 */
function getScenarioSplitCounts(
  baseline: Record<string, BaselineEquipmentEntry>,
  scenario: Record<string, ScenarioEquipmentEntry>,
): { diesel: Record<string, number>; electric: Record<string, number> } {
  const diesel: Record<string, number> = {}
  const electric: Record<string, number> = {}
  for (const [key, baseEntry] of Object.entries(baseline)) {
    const scenEntry = scenario[key] ?? { num_to_convert: 0, num_to_add: 0 }
    const converted = Math.min(scenEntry.num_to_convert, baseEntry.existing_diesel)
    diesel[key] = baseEntry.existing_diesel - converted
    electric[key] = baseEntry.existing_electric + converted + scenEntry.num_to_add
  }
  return { diesel, electric }
}

/**
 * Merge BerthDefinition with BerthScenarioConfig for calculation
 */
type MergedBerth = BerthDefinition & { ops_enabled: boolean; dc_enabled: boolean }

function mergeBerthConfigs(
  berths: BerthDefinition[],
  scenarios: BerthScenarioConfig[]
): MergedBerth[] {
  return berths.map((berth) => {
    const scenario = scenarios.find((s) => s.berth_id === berth.id)
    return {
      ...berth,
      ops_enabled: scenario?.ops_enabled ?? false,
      dc_enabled: scenario?.dc_enabled ?? false,
    }
  })
}

// ═══════════════════════════════════════════════════════════
// ZEPA SIMULTANEITY FACTOR (ks) TABLES
// ═══════════════════════════════════════════════════════════

/**
 * ZEPA ks tables from DB_EQUIPMENT Rows 122-149.
 * Two tables exist:
 *   - STS/General: factor = 0.9, ks(n) = 0.9 / peak_usage(n) — used for ALL equipment except ASC
 *   - ASC: factor = 0.5, ks(n) = 0.5 / peak_usage(n) — used only for ASC
 *
 * For equipment counts > 70, use ks(70) as the floor value.
 * For intermediate counts (e.g., 22), linearly interpolate between table entries.
 * EVSE chargers do NOT use ZEPA ks (no coincidence factor).
 * OPS connections use a separate 0.8 per-group coincidence (not ZEPA).
 */
const ZEPA_STS_KS: [number, number][] = [
  [1, 1.0], [2, 0.8181818181818181], [3, 0.6923076923076923], [4, 0.6428571428571429],
  [5, 0.5625], [6, 0.5294117647058824], [7, 0.4736842105263158], [8, 0.45],
  [9, 0.42857142857142855], [10, 0.391304347826087], [11, 0.375], [12, 0.34615384615384615],
  [13, 0.3333333333333333], [14, 0.32142857142857145], [15, 0.3], [16, 0.2903225806451613],
  [17, 0.27272727272727276], [18, 0.2647058823529412], [19, 0.2571428571428572],
  [20, 0.24324324324324323], [25, 0.20930232558139536], [30, 0.18], [35, 0.15789473684210525],
  [40, 0.14285714285714288], [45, 0.1285714285714286], [70, 0.08737864077669903],
]

const ZEPA_ASC_KS: [number, number][] = [
  [1, 1.0], [2, 0.8333333333333334], [3, 0.7142857142857143], [4, 0.625],
  [5, 0.5], [6, 0.45454545454545453], [7, 0.4166666666666667], [8, 0.3846153846153846],
  [9, 0.35714285714285715], [10, 0.3333333333333333], [11, 0.3125], [12, 0.29411764705882354],
  [13, 0.2777777777777778], [14, 0.2631578947368421], [15, 0.25], [16, 0.23809523809523808],
  [17, 0.22727272727272727], [18, 0.20833333333333334], [19, 0.2],
  [20, 0.1923076923076923], [25, 0.16129032258064516], [30, 0.1388888888888889],
  [35, 0.12195121951219513], [40, 0.10638297872340426], [45, 0.09615384615384615],
  [70, 0.06410256410256411],
]

/**
 * Look up ZEPA ks value from a table using nearest-match-below (floor).
 * Matches Excel XLOOKUP with match_mode = -1 (exact or next smaller).
 * For counts beyond the last table entry (n > 70), returns the last value.
 */
function lookupZepaKs(count: number, table: [number, number][]): number {
  if (count <= 0) return 0
  if (count <= 1) return 1.0

  // Find the largest threshold_units <= count (floor match)
  let result = table[0][1] // default to first entry
  for (const [n, ks] of table) {
    if (n <= count) {
      result = ks
    } else {
      break // table is sorted ascending, no need to continue
    }
  }
  return result
}

/**
 * Get ZEPA ks for an equipment type.
 * ASC uses its own table (factor 0.5), all others use STS table (factor 0.9).
 */
function getEquipmentZepaKs(equipmentKey: string, count: number): number {
  if (equipmentKey === 'asc') {
    return lookupZepaKs(count, ZEPA_ASC_KS)
  }
  return lookupZepaKs(count, ZEPA_STS_KS)
}

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
 * PIECE Formula (for most equipment, teu_ratio > 0):
 *   Each equipment TYPE handles ALL annual_TEU throughput (not annual_TEU / ratio).
 *   The teu_ratio is a fleet sizing guide only, NOT a throughput divider.
 *
 *   Throughput split uses capacity-based allocation (matching the Excel model):
 *     capacity_per_unit = moves_per_hour × 8760 × utilization × teu_per_move
 *     electric_handling = min(electric_qty × capacity, annual_teu)
 *     diesel_handling = annual_teu - electric_handling
 *     electric_kwh = kwh_per_teu × electric_handling
 *     diesel_liters = liters_per_teu × diesel_handling
 *
 * REEFER/AHBSS EXCEPTION (teu_ratio = 0): quantity IS TEU, so:
 *   electric: annual_kwh = kwh_per_teu × quantity
 *   diesel:   annual_L   = liters_per_teu × quantity
 *
 * CRITICAL: ANY equipment type can have BOTH diesel and electric variants.
 * For example, a terminal may have 65 diesel RTGs + 1 electric RTG.
 * Diesel units consume fuel (liters_per_teu), electric units consume power (kwh_per_teu).
 *
 * @param dieselCounts - Number of diesel-powered units per equipment key
 * @param electricCounts - Number of electric-powered units per equipment key
 * @param capexCounts - Number of units requiring new CAPEX (converted + added in scenario)
 */
export function calculateEquipmentPiece(
  dieselCounts: Record<string, number>,
  electricCounts: Record<string, number>,
  capexCounts: Record<string, number>,
  annualTeu: number,
  pieceEquipment: PieceEquipmentRow[],
  economicMap: Record<string, number>,
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
  const dieselEfWtw = economicMap['diesel_ef_wtw'] ?? 3.28564 // kgCO2e/L WTW
  const gridEf = economicMap['grid_ef'] ?? 0 // kgCO2/kWh (0 = 100% green)
  const maintenanceSaving = economicMap['maintenance_saving'] ?? 0.25
  const utilizationFactor = economicMap['utilization_factor'] ?? 0.85
  const teuPerMove = economicMap['teu_per_move'] ?? 1.7

  const lineItems: PieceEquipmentLineItem[] = []
  let totalDiesel = 0
  let totalKwh = 0
  let totalCo2 = 0
  let totalOpex = 0
  let totalCapex = 0

  for (const meta of pieceEquipment) {
    const equipmentKey = meta.equipment_key
    const dieselQty = dieselCounts[equipmentKey] ?? 0
    const electricQty = electricCounts[equipmentKey] ?? 0
    const capexQty = capexCounts[equipmentKey] ?? 0
    const totalQty = dieselQty + electricQty
    if (totalQty <= 0) continue

    // Compute throughput handled by diesel vs electric units
    let dieselHandling: number
    let electricHandling: number

    if (meta.teu_ratio === 0) {
      // Reefer/AHBSS: quantity IS the TEU count, direct multiplication
      dieselHandling = dieselQty
      electricHandling = electricQty
    } else {
      // Each equipment TYPE handles ALL annual_TEU throughput.
      // Split using capacity-based allocation (Excel model, fn calc_terminal_emissions):
      //   capacity_per_unit = MPH × 8760 × utilization × TEU_per_move
      //   Electric units handle up to their capacity (capped by throughput)
      //   Diesel gets remainder, also capped by diesel capacity
      if (meta.moves_per_hour > 0) {
        const capacityPerUnit = meta.moves_per_hour * 8760 * utilizationFactor * teuPerMove
        electricHandling = Math.min(electricQty * capacityPerUnit, annualTeu)
        // Excel: MIN(diesel_capacity, throughput - electric_capacity)
        const dieselCapacity = dieselQty * capacityPerUnit
        dieselHandling = Math.min(dieselCapacity, annualTeu - electricHandling)
      } else {
        // Fallback: proportional split by unit count
        electricHandling = annualTeu * (electricQty / totalQty)
        dieselHandling = annualTeu - electricHandling
      }
    }

    // Diesel units → liters consumption
    const annualDieselL = meta.liters_per_teu * dieselHandling

    // Electric units → kWh consumption
    const annualKwh = meta.kwh_per_teu * electricHandling

    // CO2 emissions
    const dieselCo2Tons = (annualDieselL * dieselEfWtw) / 1000
    const electricCo2Tons = (annualKwh * gridEf) / 1000
    const co2Tons = dieselCo2Tons + electricCo2Tons

    // Costs
    const fuelCost = annualDieselL * dieselPrice
    const energyCost = annualKwh * electricityPrice

    // Maintenance OPEX:
    // - Electric units: annual_opex_usd from DB (already the reduced/electric rate)
    // - Diesel units: maintenance_saving (0.25) means electric is 25% cheaper than diesel,
    //   so diesel rate = electric_rate / (1 - 0.25) = electric_rate / 0.75
    const electricMaintenanceCost = meta.annual_opex_usd * electricQty
    const dieselMaintenancePerUnit = maintenanceSaving > 0
      ? meta.annual_opex_usd / (1 - maintenanceSaving)
      : meta.annual_opex_usd
    const dieselMaintenanceCost = dieselMaintenancePerUnit * dieselQty
    const maintenanceCost = electricMaintenanceCost + dieselMaintenanceCost

    const totalOpexItem = fuelCost + energyCost + maintenanceCost

    // CAPEX: only for units that need new equipment (converted + added)
    const totalItemCapex = meta.capex_usd * capexQty

    const lineItem: PieceEquipmentLineItem = {
      equipment_key: equipmentKey,
      display_name: meta.display_name,
      equipment_category: meta.equipment_category,
      equipment_type: meta.equipment_type,
      quantity: totalQty,
      kwh_per_teu: meta.kwh_per_teu,
      teu_ratio: meta.teu_ratio,
      annual_kwh: annualKwh,
      annual_diesel_liters: annualDieselL,
      annual_co2_tons: co2Tons,
      annual_energy_cost_usd: energyCost,
      annual_fuel_cost_usd: fuelCost,
      annual_maintenance_usd: maintenanceCost,
      annual_total_opex_usd: totalOpexItem,
      unit_capex_usd: capexQty > 0 ? meta.capex_usd : 0,
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
  berths: MergedBerth[],
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
  const electricityPrice = economicMap['electricity_price'] ?? 0.12
  const gridEf = economicMap['grid_ef'] ?? 0 // kgCO2/kWh

  // OPS emission factor: HFO CO2 per MWh of vessel auxiliary power at berth
  // Formula from DOCUMENTATION: MT_HFO_PER_MWH / ENGINE_EFF * HFO_WTW_EF
  //   MT_HFO_PER_MWH = MJ_PER_MWH / LHV_HFO / 1000 = 3600 / 40.2 / 1000 = 0.08955
  //   ENGINE_EFF = 0.45 (diesel engine thermal efficiency)
  //   HFO_WTW_EF = HFO_WTT + HFO_TTW = 0.5427 + 3.114 = 3.6567 kgCO2e/kg
  // Result: 0.08955 / 0.45 * 3.6567 = 0.72769 tCO2e/MWh
  const engineEff = economicMap['engine_efficiency'] ?? 0.45
  const hfoWtw = economicMap['hfo_ef_wtw'] ?? 3.6567 // kgCO2e/kg HFO (WTW)
  const mtHfoPerMwh = 3600 / 40.2 / 1000 // 0.08955 MT HFO per MWh mechanical
  const vesselAuxEfPerMwh = mtHfoPerMwh / engineEff * hfoWtw // ~0.7277 tCO2e/MWh

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
    // CAPEX & infrastructure sizing uses MAX vessel segment (design capacity)
    const maxFleetRow = fleetOps.find(
      (f) => f.vessel_segment_key === berth.max_vessel_segment_key
    )
    // Current operations lookup — drives energy/OPEX calculations
    const currentFleetRow = fleetOps.find(
      (f) => f.vessel_segment_key === berth.current_vessel_segment_key
    )

    // Default values if segment not found — all sized to MAX vessel
    const opsPowerMw = maxFleetRow?.ops_power_mw ?? 2.0
    const transformerCapex = maxFleetRow?.transformer_capex_usd ?? 350000
    const converterCapex = maxFleetRow?.converter_capex_usd ?? 280000
    const civilWorksCapex = maxFleetRow?.civil_works_capex_usd ?? 124000
    const opsAnnualOpex = maxFleetRow?.annual_opex_usd ?? 10000

    // Total OPS CAPEX for this berth (if OPS enabled)
    const berth_ops_capex = berth.ops_enabled
      ? transformerCapex + converterCapex + civilWorksCapex
      : 0

    // ── OPS Energy: P_OPS × T_ALONGSIDE × annual_calls ──
    // This is the shore power energy that replaces vessel auxiliary engine HFO
    const shorePowerMwh = opsPowerMw * berth.avg_berth_hours * berth.annual_calls
    const shorePowerKwh = shorePowerMwh * 1000

    // Annual berth hours (for display)
    const annualBerthHours = berth.annual_calls * berth.avg_berth_hours

    // Baseline emissions: vessel burns HFO at berth
    // If berth already has OPS (ops_existing), baseline uses shore power → grid emissions
    // Otherwise, vessel runs auxiliary engines → vessel_aux_ef emissions
    const baselineCo2Tons = shorePowerMwh * vesselAuxEfPerMwh

    // Scenario: OPS-enabled berths use shore power from grid
    let scenarioShorePowerKwh = 0
    let scenarioCo2Tons = 0
    let scenarioEnergyCost = 0

    if (berth.ops_enabled) {
      scenarioShorePowerKwh = shorePowerKwh
      scenarioCo2Tons = (scenarioShorePowerKwh * gridEf) / 1000
      scenarioEnergyCost = scenarioShorePowerKwh * electricityPrice
    } else {
      // No OPS — vessel still uses auxiliary engines
      scenarioCo2Tons = baselineCo2Tons
    }

    const lineItem: PieceBerthLineItem = {
      berth_id: berth.id,
      berth_name: berth.berth_name,
      berth_number: berth.berth_number,
      max_vessel_segment_key: berth.max_vessel_segment_key,
      max_vessel_segment_name: maxFleetRow?.display_name ?? berth.max_vessel_segment_key,
      current_vessel_segment_key: berth.current_vessel_segment_key,
      current_vessel_segment_name: currentFleetRow?.display_name ?? berth.current_vessel_segment_key,
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
      baseline_diesel_liters: 0, // OPS model uses MWh, not liters
      baseline_co2_tons: baselineCo2Tons,
      baseline_fuel_cost_usd: 0,
      scenario_diesel_liters: 0,
      scenario_shore_power_kwh: scenarioShorePowerKwh,
      scenario_co2_tons: scenarioCo2Tons,
      scenario_fuel_cost_usd: 0,
      scenario_energy_cost_usd: scenarioEnergyCost,
    }

    lineItems.push(lineItem)

    // Accumulate totals
    if (berth.ops_enabled) {
      totalOpsCapex += berth_ops_capex
      totalOpsOpex += opsAnnualOpex
      totalOpsPeakMw += opsPowerMw
    }
    totalBaselineCo2 += baselineCo2Tons
    totalScenarioShorePower += scenarioShorePowerKwh
    totalScenarioCo2 += scenarioCo2Tons
    totalScenarioCost += scenarioEnergyCost
  }

  return {
    lineItems,
    totals: {
      total_ops_capex_usd: totalOpsCapex,
      total_ops_opex_usd: totalOpsOpex,
      total_ops_peak_mw: totalOpsPeakMw,
      baseline_diesel_liters: 0, // OPS model uses MWh-based emissions, not liters
      baseline_co2_tons: totalBaselineCo2,
      baseline_fuel_cost_usd: 0,
      scenario_diesel_liters: 0,
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
  numNonZeroGroups: number,
  cableLengthM: number,
  gridData: PieceGridRow[],
  totalAnnualKwh: number = 0,
): PieceGridResult {
  const grossPeakMw = equipmentPeakMw + opsPeakMw + evsePeakMw

  // Between-groups coincidence factor: 0.8 when multiple groups contribute,
  // 1.0 when only a single group (no diversity). Excel DB_GRID Row 27.
  // NOTE: The DB_GRID Row 55 value of 0.9 is for between-TERMINALS (central substation),
  // not between-groups within a terminal.
  const simultaneityFactor = numNonZeroGroups >= 2 ? 0.8 : 1.0

  const netPeakMw = grossPeakMw * simultaneityFactor

  // Apply growth factor and transformer safety margin (Excel DB_GRID Row 56-57)
  const growthFactor = 1.2
  const safetyMargin = 1.2
  const transformerRatingMw = netPeakMw * growthFactor * safetyMargin

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

  // Substation CAPEX sized to transformer rating (with growth/safety factors)
  // Split: 80% material, 20% civil works (Excel DB_GRID Row 61)
  const materialCapex = substationCostPerMw * transformerRatingMw
  const civilWorksCapex = materialCapex * 0.25 // 20% of total = 25% of material

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

  // Grid OPEX: (2 × MW + 200) / 1000 M$/year (Excel DB_GRID Row 70)
  // The Excel computes this at PORT level using sum of terminal transformer ratings.
  // We compute per-terminal using the terminal's transformer rating. The $200K base
  // component cancels out in baseline vs scenario comparison for payback.
  const gridOpexMillion = (2 * transformerRatingMw + 200) / 1000
  const gridOpexUsd = gridOpexMillion * 1_000_000

  // Grid internal consumption: 7% of overall yearly consumption (Excel DB_GRID Row 67)
  const gridConsumptionKwh = totalAnnualKwh * 0.07

  const totalGridCapex = materialCapex + civilWorksCapex + cableCapex

  return {
    total_equipment_peak_mw: equipmentPeakMw,
    total_ops_peak_mw: opsPeakMw,
    total_evse_peak_mw: evsePeakMw,
    gross_peak_demand_mw: grossPeakMw,
    simultaneity_factor: simultaneityFactor,
    net_peak_demand_mw: netPeakMw,
    transformer_rating_mw: transformerRatingMw,
    substation_type: substationType,
    substation_material_capex_usd: materialCapex,
    civil_works_capex_usd: civilWorksCapex,
    substation_capex_usd: materialCapex + civilWorksCapex,
    cable_length_m: cableLengthM,
    cable_type: cableType,
    cable_capex_usd: cableCapex,
    grid_opex_usd: gridOpexUsd,
    grid_consumption_kwh: gridConsumptionKwh,
    total_grid_capex_usd: totalGridCapex,
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

  // Get separate diesel and electric counts for baseline and scenario
  const baselineSplit = getBaselineSplitCounts(terminal.baseline_equipment)
  const scenarioSplit = getScenarioSplitCounts(
    terminal.baseline_equipment,
    terminal.scenario_equipment,
  )

  // Compute CAPEX counts: units needing new equipment investment
  // = num_to_convert + num_to_add per equipment key
  const capexCounts: Record<string, number> = {}
  for (const [key, scenEntry] of Object.entries(terminal.scenario_equipment)) {
    const converted = Math.min(
      scenEntry.num_to_convert,
      terminal.baseline_equipment[key]?.existing_diesel ?? 0
    )
    const total = converted + scenEntry.num_to_add
    if (total > 0) capexCounts[key] = total
  }

  // Merge berth definitions with scenario configs
  const mergedBerths = mergeBerthConfigs(terminal.berths, terminal.berth_scenarios ?? [])

  // ── Baseline Equipment ──
  // Diesel units → liters_per_teu, Electric units → kwh_per_teu
  // No CAPEX in baseline (empty capex counts)
  const baselineResult = calculateEquipmentPiece(
    baselineSplit.diesel,
    baselineSplit.electric,
    {}, // no CAPEX in baseline
    terminal.annual_teu,
    terminalEquipment,
    economicMap,
  )

  // ── Scenario Equipment (after electrification) ──
  // Remaining diesel units → liters_per_teu, all electric → kwh_per_teu
  // CAPEX for converted + newly added units
  const scenarioResult = calculateEquipmentPiece(
    scenarioSplit.diesel,
    scenarioSplit.electric,
    capexCounts,
    terminal.annual_teu,
    terminalEquipment,
    economicMap,
  )

  // ── Chargers (scenario only, for battery-powered equipment) ──
  // Filter to battery-powered equipment only — chargers only for electric battery equipment
  const batteryEquipmentKeys = terminalEquipment
    .filter((e) => e.equipment_category === 'battery_powered')
    .map((e) => e.equipment_key)

  const batteryEquipmentCounts: Record<string, number> = {}
  for (const key of batteryEquipmentKeys) {
    const count = scenarioSplit.electric[key] ?? 0
    if (count > 0) {
      batteryEquipmentCounts[key] = count
    }
  }

  const chargerResult = calculateChargers(
    batteryEquipmentCounts,
    assumptions.evse,
    terminal.charger_overrides
  )

  // ── Berths / OPS ──
  const berthResult = calculateBerthInfrastructure(
    mergedBerths,
    assumptions.fleetOps,
    economicMap
  )

  // ── Grid Infrastructure ──
  // CRITICAL: Only GRID-POWERED equipment contributes directly to equipment peak.
  // Battery-powered equipment (TT, AGV, ECH, RS, SC) draws grid power through
  // EVSE chargers, so it's counted in charger peak, NOT equipment peak.
  // Each grid-powered equipment type gets a ZEPA ks simultaneity factor.

  // Scenario equipment peak (grid-powered only, with ZEPA ks)
  let scenarioEquipmentPeakKw = 0
  let scenarioEquipmentGroups = 0
  for (const [key, qty] of Object.entries(scenarioSplit.electric)) {
    const meta = terminalEquipment.find((e) => e.equipment_key === key)
    if (meta && qty > 0 && meta.equipment_category === 'grid_powered') {
      const ks = getEquipmentZepaKs(key, qty)
      scenarioEquipmentPeakKw += meta.peak_power_kw * qty * ks
      scenarioEquipmentGroups++
    }
  }
  const scenarioEquipmentPeakMw = scenarioEquipmentPeakKw / 1000

  // Baseline equipment peak (grid-powered only, with ZEPA ks)
  let baselineEquipmentPeakKw = 0
  let baselineEquipmentGroups = 0
  for (const [key, qty] of Object.entries(baselineSplit.electric)) {
    const meta = terminalEquipment.find((e) => e.equipment_key === key)
    if (meta && qty > 0 && meta.equipment_category === 'grid_powered') {
      const ks = getEquipmentZepaKs(key, qty)
      baselineEquipmentPeakKw += meta.peak_power_kw * qty * ks
      baselineEquipmentGroups++
    }
  }
  const baselineEquipmentPeakMw = baselineEquipmentPeakKw / 1000

  // OPS peak with per-group coincidence (0.8 when count > 1 in same power group)
  // Group OPS-enabled berths by their OPS power level, apply 0.8 diversity per group
  const scenarioOpsGroups: Record<number, number> = {}
  for (const berth of mergedBerths) {
    if (berth.ops_enabled) {
      const maxFleetRow = assumptions.fleetOps.find(
        (f) => f.vessel_segment_key === berth.max_vessel_segment_key
      )
      const opsPowerMw = maxFleetRow?.ops_power_mw ?? 2.0
      scenarioOpsGroups[opsPowerMw] = (scenarioOpsGroups[opsPowerMw] ?? 0) + 1
    }
  }
  let scenarioOpsPeakKw = 0
  let scenarioOpsGroupCount = 0
  for (const [powerMwStr, count] of Object.entries(scenarioOpsGroups)) {
    const powerMw = Number(powerMwStr)
    const groupCoincidence = count > 1 ? 0.8 : 1.0
    scenarioOpsPeakKw += count * powerMw * 1000 * groupCoincidence
    scenarioOpsGroupCount++
  }
  const scenarioOpsPeakMw = scenarioOpsPeakKw / 1000

  // Baseline OPS peak (existing OPS berths)
  const baselineOpsGroups: Record<number, number> = {}
  for (const berth of mergedBerths) {
    if (berth.ops_existing) {
      const maxFleetRow = assumptions.fleetOps.find(
        (f) => f.vessel_segment_key === berth.max_vessel_segment_key
      )
      const opsPowerMw = maxFleetRow?.ops_power_mw ?? 2.0
      baselineOpsGroups[opsPowerMw] = (baselineOpsGroups[opsPowerMw] ?? 0) + 1
    }
  }
  let baselineOpsPeakKw = 0
  let baselineOpsGroupCount = 0
  for (const [powerMwStr, count] of Object.entries(baselineOpsGroups)) {
    const powerMw = Number(powerMwStr)
    const groupCoincidence = count > 1 ? 0.8 : 1.0
    baselineOpsPeakKw += count * powerMw * 1000 * groupCoincidence
    baselineOpsGroupCount++
  }

  // EVSE charger peak (no ZEPA ks for chargers)
  const scenarioEvsePeakKw = chargerResult.totals.total_power_kw
  const scenarioEvseGroups = chargerResult.lineItems.filter(
    (item) => item.chargers_final > 0
  ).length

  // Baseline EVSE: chargers for existing electric battery equipment
  const baselineBatteryKeys = terminalEquipment
    .filter((e) => e.equipment_category === 'battery_powered')
    .map((e) => e.equipment_key)
  const baselineBatteryElectric: Record<string, number> = {}
  for (const key of baselineBatteryKeys) {
    const count = baselineSplit.electric[key] ?? 0
    if (count > 0) baselineBatteryElectric[key] = count
  }
  const baselineChargerResult = calculateChargers(baselineBatteryElectric, assumptions.evse)
  const baselineEvsePeakKw = baselineChargerResult.totals.total_power_kw
  const baselineEvseGroups = baselineChargerResult.lineItems.filter(
    (item) => item.chargers_final > 0
  ).length

  // Count non-zero groups for between-groups coincidence
  const scenarioNonZeroGroups =
    scenarioEquipmentGroups + scenarioOpsGroupCount + scenarioEvseGroups
  const baselineNonZeroGroups =
    baselineEquipmentGroups + baselineOpsGroupCount + baselineEvseGroups

  // Total annual kWh for grid consumption calculation (equipment + OPS shore power)
  const totalScenarioKwh = scenarioResult.totals.total_kwh +
    berthResult.totals.scenario_shore_power_kwh

  const gridResult = calculateGridInfra(
    scenarioEquipmentPeakMw,
    scenarioOpsPeakMw,
    scenarioEvsePeakKw / 1000,
    scenarioNonZeroGroups,
    terminal.cable_length_m ?? 500, // Default 500m
    assumptions.grid,
    totalScenarioKwh,
  )

  // ── Baseline Grid OPEX ──
  // The baseline port already has grid infrastructure for existing electric equipment.
  // We compute baseline grid OPEX using the same formula so the payback comparison
  // reflects only INCREMENTAL grid costs, matching the Excel model.
  const baselineGrossPeakMw =
    baselineEquipmentPeakMw + (baselineOpsPeakKw / 1000) + (baselineEvsePeakKw / 1000)
  const baselineSimultaneity = baselineNonZeroGroups >= 2 ? 0.8 : 1.0
  const baselineNetPeakMw = baselineGrossPeakMw * baselineSimultaneity
  // Use transformer rating (net × 1.2 growth × 1.2 safety) to match Excel OPEX formula
  const baselineTransformerMw = baselineNetPeakMw * 1.2 * 1.2
  const baselineGridOpexUsd = ((2 * baselineTransformerMw + 200) / 1000) * 1_000_000

  // ── Total OPEX/CAPEX ──
  const totalBaselineOpex =
    baselineResult.totals.total_opex_usd +
    berthResult.totals.baseline_fuel_cost_usd +
    baselineGridOpexUsd

  // NOTE: OPS shore power electricity cost (berthResult.totals.scenario_cost_usd) is excluded
  // from OPEX comparison. Per Excel model, the port doesn't pay for vessel at-berth energy
  // (HFO in baseline, shore power in scenario) — it's passed through to shipping companies.
  // Only infrastructure maintenance costs are included.
  const totalScenarioOpex =
    scenarioResult.totals.total_opex_usd +
    chargerResult.totals.total_annual_opex_usd +
    berthResult.totals.total_ops_opex_usd +
    gridResult.grid_opex_usd

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
