// ═══════════════════════════════════════════════════════════
// INPUT TYPES — Frontend → API
// ═══════════════════════════════════════════════════════════

export type PortConfig = {
  name: string
  location: string
  size_key: '' | 'small_feeder' | 'regional' | 'hub' | 'mega_hub'
}

// ── PIECE Terminal Types ─────────────────────────────────────
export type TerminalType = 'container' | 'cruise' | 'roro'

// ═══════════════════════════════════════════════════════════
// BASELINE TYPES (Section 1) — Define Current Port State
// ═══════════════════════════════════════════════════════════

/** Equipment counts for baseline: how many diesel vs already electric */
export type BaselineEquipmentEntry = {
  existing_diesel: number    // e.g., 5 diesel terminal tractors
  existing_electric: number  // e.g., 2 already electric tractors
}

/** Vessel call entry — defines a vessel type's annual call frequency and berth time */
export type BerthVesselCall = {
  id: string
  vessel_segment_key: string
  annual_calls: number
  avg_berth_hours: number
}

/** Berth definition — physical berth infrastructure (vessel calls are at terminal level) */
export type BerthDefinition = {
  id: string
  berth_number: number
  berth_name: string
  max_vessel_segment_key: string       // Design capacity — largest vessel the berth can handle (drives CAPEX, cable sizing)
  ops_existing: boolean        // Does this berth already have OPS infrastructure?
  dc_existing: boolean         // Does this berth already have DC charging infrastructure?
}

/** Buildings & lighting configuration */
export type BuildingsLightingConfig = {
  // Buildings (square meters)
  warehouse_sqm: number
  office_sqm: number
  workshop_sqm: number
  // Lighting (unit counts)
  high_mast_lights: number      // 1000W each
  area_lights: number           // 400W each
  roadway_lights: number        // 250W each
  // Operating hours
  annual_operating_hours: number  // Default: 8760 (24/7)
}

/** Port services baseline: existing diesel and electric counts + operation parameters */
export type PortServicesBaseline = {
  tugs_diesel: number
  tugs_electric: number
  pilot_boats_diesel: number
  pilot_boats_electric: number
  tug_avg_hours_per_call?: number      // Avg tug operation hours per vessel call (default 4)
  pilot_avg_hours_per_call?: number    // Avg pilot operation hours per vessel call (default 4)
}

// ═══════════════════════════════════════════════════════════
// SCENARIO TYPES (Section 2) — Define Changes to Make
// ═══════════════════════════════════════════════════════════

/** Equipment changes for scenario: how many to convert, how many to add */
export type ScenarioEquipmentEntry = {
  num_to_convert: number  // Convert X diesel → electric
  num_to_add: number      // Add X new electric units
}

/** Berth scenario config: OPS/DC toggles for each berth */
export type BerthScenarioConfig = {
  berth_id: string         // References BerthDefinition.id
  ops_enabled: boolean     // Enable OPS shore power infrastructure
  dc_enabled: boolean      // Enable DC fast charging for electric vessels
}

/** Port services scenario: how many to convert/add */
export type PortServicesScenario = {
  tugs_to_convert: number
  tugs_to_add: number
  pilot_boats_to_convert: number
  pilot_boats_to_add: number
}

// ═══════════════════════════════════════════════════════════
// LEGACY TYPES (for backward compatibility)
// ═══════════════════════════════════════════════════════════

/** @deprecated Use PortServicesBaseline instead */
export type PortServicesConfig = PortServicesBaseline

/** @deprecated Legacy BerthConfig with ops/dc flags - use BerthDefinition + BerthScenarioConfig */
export type BerthConfig = {
  id: string
  berth_number: number
  berth_name: string
  vessel_segment_key: string
  annual_calls: number
  avg_berth_hours: number
  ops_enabled: boolean
  dc_enabled: boolean
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

// ── PIECE Terminal Config (new structure) ─────────────────────
export type PieceTerminalConfig = {
  id: string
  name: string
  terminal_type: TerminalType

  // ══════════════════════════════════════════════════════════
  // OPERATIONS — Throughput & vessel traffic (baseline data)
  // ══════════════════════════════════════════════════════════

  annual_teu: number              // For container
  annual_passengers?: number      // For cruise
  annual_ceu?: number             // For RoRo (Car Equivalent Units)

  /** Vessel calls at terminal level — shared across all berths */
  vessel_calls: BerthVesselCall[]

  // ══════════════════════════════════════════════════════════
  // BASELINE (Section 1) — Current state
  // ══════════════════════════════════════════════════════════

  /** Equipment: existing diesel + electric counts per equipment type */
  baseline_equipment: Record<string, BaselineEquipmentEntry>

  /** Berths: physical berth definitions (name, max vessel, OPS/DC flags) */
  berths: BerthDefinition[]

  /** Buildings & lighting (optional) */
  buildings_lighting?: BuildingsLightingConfig

  // ══════════════════════════════════════════════════════════
  // SCENARIO (Section 2) — Changes to make
  // ══════════════════════════════════════════════════════════

  /** Equipment: how many to convert + how many to add per type */
  scenario_equipment: Record<string, ScenarioEquipmentEntry>

  /** Berth scenarios: OPS/DC toggles per berth */
  berth_scenarios: BerthScenarioConfig[]

  // Charger overrides (auto-calculated from equipment, but can be manually adjusted)
  charger_overrides?: Record<string, number>

  // Grid infrastructure
  cable_length_m?: number         // Total cable run in meters
}

export type PieceCalculationRequest = {
  port: PortConfig
  terminals: PieceTerminalConfig[]

  // Port-level services (tugs, pilot boats)
  port_services_baseline?: PortServicesBaseline
  port_services_scenario?: PortServicesScenario

  // Port-level buildings & lighting (if not per-terminal)
  buildings_lighting?: BuildingsLightingConfig

  // Override PIECE economic defaults (legacy — prefer assumption_profile)
  economic_overrides?: Record<string, number>

  // Assumption profile name for custom overrides (default = 'default')
  assumption_profile?: string
}

export type CalculationRequest = {
  port: PortConfig
  terminals: TerminalConfig[]
}

// ═══════════════════════════════════════════════════════════
// PROJECT / SCENARIO TYPES — Multi-scenario architecture
// ═══════════════════════════════════════════════════════════

/** Per-terminal baseline stored at project level */
export type BaselineTerminalConfig = {
  id: string
  name: string
  terminal_type: TerminalType
  berths: BerthDefinition[]
  baseline_equipment: Record<string, BaselineEquipmentEntry>
  cable_length_m?: number
  // Operations (throughput + vessel traffic)
  annual_teu: number
  annual_passengers?: number
  annual_ceu?: number
  vessel_calls: BerthVesselCall[]
}

/** Project-level baseline blob (stored as JSONB in piece_projects.baseline_config) */
export type ProjectBaseline = {
  terminals: BaselineTerminalConfig[]
  /** Port-wide offshore equipment (tugs, pilot boats) */
  port_services_baseline?: PortServicesBaseline
}

/** Per-terminal scenario data (keyed by terminal_id) — electrification choices only */
export type ScenarioTerminalConfig = {
  terminal_id: string
  scenario_equipment: Record<string, ScenarioEquipmentEntry>
  berth_scenarios: BerthScenarioConfig[]
  charger_overrides?: Record<string, number>
}

/** Scenario-level data blob (stored as JSONB in piece_scenarios.scenario_config) */
export type ScenarioConfig = {
  terminals: ScenarioTerminalConfig[]
  /** Port-wide offshore equipment scenario (convert/add tugs and pilot boats) */
  port_services_scenario?: PortServicesScenario
}

/** Summary type for project list views */
export type ProjectSummary = {
  id: string
  project_name: string
  description: string | null
  port_name: string
  port_location: string
  port_size_key: string
  terminal_count: number
  scenario_count: number
  created_at: string
  updated_at: string
}

/** Summary type for scenario list views */
export type ScenarioSummary = {
  id: string
  project_id: string
  scenario_name: string
  description: string | null
  sort_order: number
  assumption_profile: string
  has_result: boolean
  total_capex_usd?: number
  co2_reduction_percent?: number
  annual_opex_savings_usd?: number
  created_at: string
  updated_at: string
}

/** Full project row from DB */
export type ProjectRow = {
  id: string
  project_name: string
  description: string | null
  port_name: string
  port_location: string
  port_size_key: string
  terminal_count: number
  port_config: PortConfig
  baseline_config: ProjectBaseline
  created_at: string
  updated_at: string
}

/** Full scenario row from DB */
export type ScenarioRow = {
  id: string
  project_id: string
  scenario_name: string
  description: string | null
  sort_order: number
  scenario_config: ScenarioConfig
  result: PiecePortResult | null
  assumption_profile: string
  assumption_hash: string | null
  created_at: string
  updated_at: string
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

// ── PIECE Database Row Types ─────────────────────────────────

export type PieceEquipmentRow = {
  id: string
  equipment_key: string
  display_name: string
  equipment_category: 'grid_powered' | 'battery_powered'
  equipment_type: 'quayside' | 'yard' | 'horizontal'
  terminal_type_key: TerminalType
  capex_usd: number
  annual_opex_usd: number
  peak_power_kw: number
  kwh_per_teu: number
  liters_per_teu: number
  teu_ratio: number
  moves_per_hour: number
  lifespan_years: number
  created_at?: string
}

export type PieceEvseRow = {
  id: string
  evse_key: string
  equipment_key: string
  display_name: string
  capex_usd: number
  annual_opex_usd: number
  power_kw: number
  units_per_charger: number
  created_at?: string
}

export type PieceFleetOpsRow = {
  id: string
  vessel_segment_key: string
  terminal_type_key: string  // TerminalType | 'port_services'
  display_name: string
  ops_power_mw: number
  transformer_capex_usd: number
  converter_capex_usd: number
  civil_works_capex_usd: number
  annual_opex_usd: number
  typical_berth_hours: number
  typical_sail_hours: number
  tugs_per_call: number
  pilots_per_call: number
  hfo_consumption_mt_per_day: number  // For service boats: fuel rate in L/h (MID_CONS)
  avg_hours_per_call: number          // Avg operation hours per vessel call (tugs/pilots)
  dc_power_mw?: number               // DC charger power (MW) for electric vessel charging
  dc_capex_usd?: number              // DC charger CAPEX per berth
  dc_annual_opex_usd?: number        // DC charger annual OPEX per berth
  created_at?: string
}

export type PieceGridRow = {
  id: string
  component_key: string
  display_name: string
  cost_per_mw: number | null
  cost_per_meter: number | null
  voltage_kv: number
  simultaneity_factor: number
  created_at?: string
}

export type EconomicAssumptionRow = {
  id: string
  assumption_key: string
  display_name: string
  value: number
  unit: string
  source: string | null
  created_at?: string
}

export type AllAssumptions = {
  benchmarks: ThroughputBenchmarkRow[]
  dieselEquipment: DieselAssumptionRow[]
  electricEquipment: ElectricAssumptionRow[]
  vesselBerth: VesselBerthRow[]
  tugboat: TugboatAssumptionRow[]
  emissionFactors: EmissionFactorRow[]
}

// ── PIECE Assumptions (all data from PIECE tables) ─────────────
export type PieceAssumptions = {
  equipment: PieceEquipmentRow[]
  evse: PieceEvseRow[]
  fleetOps: PieceFleetOpsRow[]
  grid: PieceGridRow[]
  economic: EconomicAssumptionRow[]
}

// Override row from piece_assumption_overrides table
export type PieceAssumptionOverride = {
  id: string
  profile_name: string
  table_name: string
  row_key: string
  column_name: string
  custom_value: number
  created_at: string
}

// Nested map: { tableName: { rowKey: { columnName: value } } }
export type OverrideMap = Record<string, Record<string, Record<string, number>>>

// Combined assumptions (old + PIECE)
export type AllPieceAssumptions = AllAssumptions & {
  piece: PieceAssumptions
}

// ═══════════════════════════════════════════════════════════
// PIECE OUTPUT TYPES — Calculation Results
// ═══════════════════════════════════════════════════════════

export type PieceEquipmentLineItem = {
  equipment_key: string
  display_name: string
  equipment_category: 'grid_powered' | 'battery_powered'
  equipment_type: string
  quantity: number
  // Throughput-based metrics
  kwh_per_teu: number
  teu_ratio: number
  annual_kwh: number
  annual_diesel_liters: number
  annual_co2_tons: number
  annual_energy_cost_usd: number
  annual_fuel_cost_usd: number
  annual_maintenance_usd: number
  annual_total_opex_usd: number
  // CAPEX (scenario only)
  unit_capex_usd: number
  total_capex_usd: number
  lifespan_years: number
}

export type PieceChargerLineItem = {
  evse_key: string
  display_name: string
  equipment_key: string
  equipment_count: number
  units_per_charger: number
  chargers_required: number
  chargers_override?: number
  chargers_final: number
  power_kw: number
  total_power_kw: number
  capex_usd: number
  total_capex_usd: number
  annual_opex_usd: number
  total_annual_opex_usd: number
}

export type PieceBerthVesselCallLineItem = {
  vessel_segment_key: string
  vessel_segment_name: string
  annual_calls: number
  avg_berth_hours: number
  annual_berth_hours: number
  ops_power_mw: number
  shore_power_mwh: number
  baseline_co2_tons: number
  scenario_shore_power_kwh: number
  scenario_co2_tons: number
  scenario_energy_cost_usd: number
}

export type PieceBerthLineItem = {
  berth_id: string
  berth_name: string
  berth_number: number
  max_vessel_segment_key: string       // Design capacity (drives CAPEX, cable sizing)
  max_vessel_segment_name: string
  // Aggregated from vessel_calls
  total_annual_calls: number
  total_annual_berth_hours: number
  vessel_calls: PieceBerthVesselCallLineItem[]
  ops_enabled: boolean
  dc_enabled: boolean
  // OPS infrastructure
  ops_power_mw: number
  ops_transformer_capex_usd: number
  ops_converter_capex_usd: number
  ops_civil_works_capex_usd: number
  ops_total_capex_usd: number
  ops_annual_opex_usd: number
  // DC charging infrastructure
  dc_power_mw: number
  dc_capex_usd: number
  dc_annual_opex_usd: number
  // At-berth emissions (baseline = all diesel, scenario = OPS fraction)
  baseline_berth_hours: number
  baseline_diesel_liters: number
  baseline_co2_tons: number
  baseline_fuel_cost_usd: number
  scenario_diesel_liters: number
  scenario_shore_power_kwh: number
  scenario_co2_tons: number
  scenario_fuel_cost_usd: number
  scenario_energy_cost_usd: number
}

export type PieceGridResult = {
  total_equipment_peak_mw: number
  total_ops_peak_mw: number
  total_evse_peak_mw: number
  gross_peak_demand_mw: number
  simultaneity_factor: number
  net_peak_demand_mw: number
  transformer_rating_mw: number        // net_peak × growth(1.2) × safety(1.2)
  substation_type: string
  substation_material_capex_usd: number // 80% of substation cost
  civil_works_capex_usd: number         // 20% of substation cost
  substation_capex_usd: number          // material + civil works
  cable_length_m: number
  cable_type: string
  cable_capex_usd: number
  grid_opex_usd: number                // (2×MW+200)/1000 M$/year
  grid_consumption_kwh: number          // 7% of total annual kWh
  total_grid_capex_usd: number
}

export type PiecePortServicesResult = {
  // Operation demand (derived from vessel calls across all terminals)
  total_tug_trips: number
  total_tug_hours: number
  total_pilot_trips: number
  total_pilot_hours: number
  // Fleet sizing
  min_tugs_required: number
  min_pilots_required: number
  max_tugs_per_call: number
  max_pilots_per_call: number
  // Baseline fleet & energy
  baseline_tugs_diesel: number
  baseline_tugs_electric: number
  baseline_pilots_diesel: number
  baseline_pilots_electric: number
  baseline_tug_fuel_liters: number
  baseline_tug_energy_kwh: number
  baseline_pilot_fuel_liters: number
  baseline_pilot_energy_kwh: number
  baseline_co2_tons: number
  baseline_fuel_cost_usd: number
  baseline_energy_cost_usd: number
  baseline_ops_maintenance_usd: number
  baseline_total_opex_usd: number
  // Scenario fleet & energy
  scenario_tugs_diesel: number
  scenario_tugs_electric: number
  scenario_pilots_diesel: number
  scenario_pilots_electric: number
  scenario_tug_fuel_liters: number
  scenario_tug_energy_kwh: number
  scenario_pilot_fuel_liters: number
  scenario_pilot_energy_kwh: number
  scenario_co2_tons: number
  scenario_fuel_cost_usd: number
  scenario_energy_cost_usd: number
  scenario_ops_maintenance_usd: number
  scenario_total_opex_usd: number
  // CAPEX (new OPS charging infrastructure for converted/added electric boats)
  tug_ops_capex_usd: number
  pilot_ops_capex_usd: number
  total_ops_capex_usd: number
}

export type PieceTerminalResult = {
  terminal_id: string
  terminal_name: string
  terminal_type: TerminalType
  annual_throughput: number  // TEU, passengers, or CEU

  // Equipment results (baseline = diesel fleet)
  baseline_equipment: PieceEquipmentLineItem[]
  baseline_totals: {
    total_diesel_liters: number
    total_kwh: number
    total_co2_tons: number
    total_opex_usd: number
  }

  // Equipment results (scenario = electrified fleet)
  scenario_equipment: PieceEquipmentLineItem[]
  scenario_totals: {
    total_diesel_liters: number
    total_kwh: number
    total_co2_tons: number
    total_opex_usd: number
    total_equipment_capex_usd: number
  }

  // Charger infrastructure (scenario only)
  chargers: PieceChargerLineItem[]
  charger_totals: {
    total_chargers: number
    total_power_kw: number
    total_capex_usd: number
    total_annual_opex_usd: number
  }

  // Berth-level OPS results
  berths: PieceBerthLineItem[]
  berth_totals: {
    total_ops_capex_usd: number
    total_ops_opex_usd: number
    total_ops_peak_mw: number
    total_dc_capex_usd: number
    total_dc_opex_usd: number
    total_dc_peak_mw: number
    baseline_diesel_liters: number
    baseline_co2_tons: number
    baseline_fuel_cost_usd: number
    scenario_diesel_liters: number
    scenario_shore_power_kwh: number
    scenario_co2_tons: number
    scenario_cost_usd: number
  }

  // Grid infrastructure (scenario only)
  grid: PieceGridResult

  // Terminal-level aggregation
  total_baseline_opex_usd: number
  total_scenario_opex_usd: number
  total_capex_usd: number
  annual_opex_savings_usd: number
  annual_co2_savings_tons: number
}

export type PiecePortResult = {
  port: PortConfig
  terminals: PieceTerminalResult[]
  port_services?: PiecePortServicesResult
  totals: {
    // Baseline totals
    baseline_diesel_liters: number
    baseline_kwh: number
    baseline_co2_tons: number
    baseline_opex_usd: number

    // Scenario totals
    scenario_diesel_liters: number
    scenario_kwh: number
    scenario_co2_tons: number
    scenario_opex_usd: number

    // CAPEX breakdown
    equipment_capex_usd: number
    charger_capex_usd: number
    ops_capex_usd: number
    dc_capex_usd: number
    grid_capex_usd: number
    port_services_capex_usd: number
    total_capex_usd: number

    // Delta metrics
    diesel_liters_saved: number
    co2_tons_saved: number
    co2_reduction_percent: number
    annual_opex_savings_usd: number
    simple_payback_years: number | null
  }
  economic_assumptions_used: Record<string, number>
}

export type PieceCalculationResponse = {
  success: boolean
  result?: PiecePortResult
  error?: string
}
