// ═══════════════════════════════════════════════════════════
// INPUT TYPES — Frontend → API
// ═══════════════════════════════════════════════════════════

export type PortConfig = {
  name: string
  location: string
  size_key: '' | 'small_feeder' | 'regional' | 'hub' | 'mega_hub'
}

export type VesselCallConfig = {
  vessel_type: string
  annual_calls: number
  avg_berth_hours: number
}

export type TugConfig = {
  type: 'diesel' | 'hybrid' | 'electric'
  count: number
}

export type OnshoreConfig = {
  annual_teu: number
  terminal_area_ha: number
  baseline_equipment: Record<string, number>   // equipment_key → qty (diesel fleet)
  scenario_equipment: Record<string, number>   // equipment_key → qty (electric fleet)
  shore_power_connections: number              // berths with shore power (scenario infra)
}

export type OffshoreConfig = {
  vessel_calls: VesselCallConfig[]
  baseline_tugs: TugConfig
  scenario_tugs: TugConfig
}

export type TerminalConfig = {
  id: string
  name: string
  cargo_type: 'container'
  onshore: OnshoreConfig
  offshore: OffshoreConfig
}

export type CalculationRequest = {
  port: PortConfig
  terminals: TerminalConfig[]
}

// ═══════════════════════════════════════════════════════════
// OUTPUT TYPES — API → Frontend
// ═══════════════════════════════════════════════════════════

export type FleetMetrics = {
  annual_diesel_liters: number
  annual_electricity_kwh: number
  annual_co2_tons: number
  annual_fuel_cost_usd: number
  annual_energy_cost_usd: number
  annual_maintenance_usd: number
  annual_total_opex_usd: number
}

export type OffshoreMetrics = {
  /** Vessel at-berth totals */
  vessel_diesel_liters: number
  vessel_co2_tons: number
  vessel_fuel_cost_usd: number
  /** Shore power (scenario only, 0 for baseline) */
  shore_power_kwh: number
  shore_power_cost_usd: number
  shore_power_co2_tons: number
  /** Tugboat totals */
  tug_diesel_liters: number
  tug_electricity_kwh: number
  tug_co2_tons: number
  tug_fuel_cost_usd: number
  tug_energy_cost_usd: number
  tug_maintenance_usd: number
  tug_capex_usd: number
  /** Aggregated */
  total_diesel_liters: number
  total_co2_tons: number
  total_cost_usd: number
}

export type BenchmarkMetrics = {
  benchmark_energy_kwh: number
  benchmark_diesel_liters: number
  benchmark_co2_tons: number
  benchmark_opex_usd: number
}

export type EquipmentLineItem = {
  equipment_key: string
  display_name: string
  equipment_type: string
  unit_label: string
  quantity: number
  annual_diesel_liters: number
  annual_electricity_kwh: number
  annual_co2_tons: number
  annual_fuel_cost_usd: number
  annual_energy_cost_usd: number
  annual_maintenance_usd: number
  annual_total_opex_usd: number
  /** Scenario-only fields (undefined for baseline) */
  unit_capex_usd?: number
  total_capex_usd?: number
  installation_cost_usd?: number
  lifespan_years?: number
}

export type TerminalResult = {
  terminal_id: string
  terminal_name: string
  onshore_baseline: FleetMetrics
  onshore_scenario: FleetMetrics
  offshore_baseline: OffshoreMetrics
  offshore_scenario: OffshoreMetrics
  benchmark: BenchmarkMetrics
  scenario_capex_usd: number
  baseline_equipment_detail: EquipmentLineItem[]
  scenario_equipment_detail: EquipmentLineItem[]
}

export type DeltaMetrics = {
  diesel_liters_saved: number
  electricity_kwh_delta: number
  co2_tons_saved: number
  annual_opex_delta_usd: number       // negative = savings
  total_capex_required_usd: number
  simple_payback_years: number | null  // null if no savings
}

export type AggregatedTotals = {
  baseline_diesel_liters: number
  baseline_electricity_kwh: number
  baseline_co2_tons: number
  baseline_total_opex_usd: number
  scenario_diesel_liters: number
  scenario_electricity_kwh: number
  scenario_co2_tons: number
  scenario_total_opex_usd: number
  total_capex_usd: number
  delta: DeltaMetrics
}

export type PortResult = {
  port: PortConfig
  terminals: TerminalResult[]
  totals: AggregatedTotals
}

export type CalculationResponse = {
  success: boolean
  result: PortResult
}

// ═══════════════════════════════════════════════════════════
// SUPABASE ROW TYPES — Matches DB table schemas
// ═══════════════════════════════════════════════════════════

export type ThroughputBenchmarkRow = {
  port_size_key: string
  display_name: string
  energy_kwh_per_teu: number
  diesel_liters_per_teu: number
  co2_tons_per_teu: number
  avg_opex_usd_per_teu: number
  avg_moves_per_vessel_call: number
}

export type DieselAssumptionRow = {
  equipment_key: string
  display_name: string
  equipment_type: string
  unit_label: string
  annual_operating_hours: number
  fuel_consumption_l_per_hour: number
  annual_maintenance_usd: number
  diesel_price_per_liter: number
  co2_kg_per_liter_diesel: number
}

export type ElectricAssumptionRow = {
  equipment_key: string
  display_name: string
  equipment_type: string
  unit_label: string
  annual_operating_hours: number
  power_consumption_kwh_per_hour: number
  annual_maintenance_usd: number
  energy_cost_per_kwh: number
  co2_kg_per_kwh_grid: number
  unit_capex_usd: number
  installation_cost_usd: number
  lifespan_years: number
}

export type VesselBerthRow = {
  vessel_type: string
  display_name: string
  avg_berth_hours: number
  auxiliary_power_kw: number
  fuel_consumption_l_per_hour_at_berth: number
  shore_power_demand_kw: number
  co2_kg_per_liter_mdo: number
}

export type TugboatAssumptionRow = {
  tug_type: string
  display_name: string
  fuel_consumption_l_per_operation: number
  power_consumption_kwh_per_operation: number
  operations_per_vessel_call: number
  annual_maintenance_usd: number
  unit_capex_usd: number
  co2_kg_per_liter_diesel: number
  co2_kg_per_kwh_grid: number
}

export type EmissionFactorRow = {
  fuel_type: string
  display_name: string
  co2_kg_per_unit: number
  unit_type: string
  source: string | null
}

export type AllAssumptions = {
  benchmarks: ThroughputBenchmarkRow[]
  dieselEquipment: DieselAssumptionRow[]
  electricEquipment: ElectricAssumptionRow[]
  vesselBerth: VesselBerthRow[]
  tugboat: TugboatAssumptionRow[]
  emissionFactors: EmissionFactorRow[]
}
