/**
 * ═══════════════════════════════════════════════════════════
 * API ROUTE — POST /api/piece/calculate
 * ═══════════════════════════════════════════════════════════
 *
 * PIECE (Port Infrastructure for Electric & Clean Energy) calculation API.
 *
 * Key features:
 *   - Uses throughput-based formula (kWh/TEU × throughput)
 *   - Supports multi-terminal types (container, cruise, roro)
 *   - Baseline: existing diesel + electric counts per equipment
 *   - Scenario: convert + add new per equipment
 *   - Berth-by-berth OPS/DC configuration
 *   - Charger infrastructure (EVSE)
 *   - Grid infrastructure modeling
 *
 * See lib/piece-engine.ts for calculation logic.
 * ═══════════════════════════════════════════════════════════
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { loadPieceAssumptions } from '@/lib/load-assumptions'
import { calculatePortPiece } from '@/lib/piece-engine'
import type {
  PieceCalculationRequest,
  PieceTerminalConfig,
  TerminalType,
  BerthDefinition,
  BerthScenarioConfig,
  BaselineEquipmentEntry,
  ScenarioEquipmentEntry,
  PortServicesBaseline,
  PortServicesScenario,
  BuildingsLightingConfig,
} from '@/lib/types'

// ── Valid enum values ────────────────────────────────────
const VALID_SIZE_KEYS = ['', 'small_feeder', 'regional', 'hub', 'mega_hub']
const VALID_TERMINAL_TYPES: TerminalType[] = ['container', 'cruise', 'roro']

// ── Validation helpers ───────────────────────────────────

function validatePortServicesBaseline(
  services: unknown,
  fieldName: string
): { ok: true; data: PortServicesBaseline } | { ok: false; error: string } {
  if (!services || typeof services !== 'object') {
    return { ok: false, error: `${fieldName} must be an object.` }
  }

  const s = services as Record<string, unknown>

  for (const field of ['tugs_diesel', 'tugs_electric', 'pilot_boats_diesel', 'pilot_boats_electric'] as const) {
    if (typeof s[field] !== 'number' || s[field] < 0) {
      return { ok: false, error: `${fieldName}.${field} must be a non-negative number.` }
    }
  }

  return {
    ok: true,
    data: {
      tugs_diesel: s.tugs_diesel as number,
      tugs_electric: s.tugs_electric as number,
      pilot_boats_diesel: s.pilot_boats_diesel as number,
      pilot_boats_electric: s.pilot_boats_electric as number,
    },
  }
}

function validatePortServicesScenario(
  services: unknown,
  fieldName: string
): { ok: true; data: PortServicesScenario } | { ok: false; error: string } {
  if (!services || typeof services !== 'object') {
    return { ok: false, error: `${fieldName} must be an object.` }
  }

  const s = services as Record<string, unknown>

  for (const field of ['tugs_to_convert', 'tugs_to_add', 'pilot_boats_to_convert', 'pilot_boats_to_add'] as const) {
    if (typeof s[field] !== 'number' || s[field] < 0) {
      return { ok: false, error: `${fieldName}.${field} must be a non-negative number.` }
    }
  }

  return {
    ok: true,
    data: {
      tugs_to_convert: s.tugs_to_convert as number,
      tugs_to_add: s.tugs_to_add as number,
      pilot_boats_to_convert: s.pilot_boats_to_convert as number,
      pilot_boats_to_add: s.pilot_boats_to_add as number,
    },
  }
}

function validateBerthDefinition(
  berth: unknown,
  index: number,
  terminalPrefix: string
): { ok: true; data: BerthDefinition } | { ok: false; error: string } {
  const prefix = `${terminalPrefix}.berths[${index}]`

  if (!berth || typeof berth !== 'object') {
    return { ok: false, error: `${prefix} must be an object.` }
  }

  const b = berth as Record<string, unknown>

  if (typeof b.id !== 'string' || !b.id) {
    return { ok: false, error: `${prefix}.id must be a non-empty string.` }
  }
  if (typeof b.berth_number !== 'number' || b.berth_number < 1) {
    return { ok: false, error: `${prefix}.berth_number must be a positive integer.` }
  }
  if (typeof b.berth_name !== 'string') {
    return { ok: false, error: `${prefix}.berth_name must be a string.` }
  }
  if (typeof b.max_vessel_segment_key !== 'string' || !b.max_vessel_segment_key) {
    return { ok: false, error: `${prefix}.max_vessel_segment_key must be a non-empty string.` }
  }
  if (typeof b.current_vessel_segment_key !== 'string' || !b.current_vessel_segment_key) {
    return { ok: false, error: `${prefix}.current_vessel_segment_key must be a non-empty string.` }
  }
  if (typeof b.annual_calls !== 'number' || b.annual_calls < 0) {
    return { ok: false, error: `${prefix}.annual_calls must be non-negative.` }
  }
  if (typeof b.avg_berth_hours !== 'number' || b.avg_berth_hours < 0) {
    return { ok: false, error: `${prefix}.avg_berth_hours must be non-negative.` }
  }

  return {
    ok: true,
    data: {
      id: b.id,
      berth_number: b.berth_number,
      berth_name: b.berth_name,
      max_vessel_segment_key: b.max_vessel_segment_key,
      current_vessel_segment_key: b.current_vessel_segment_key,
      annual_calls: b.annual_calls,
      avg_berth_hours: b.avg_berth_hours,
      ops_existing: !!b.ops_existing,
      dc_existing: !!b.dc_existing,
    },
  }
}

function validateBerthScenario(
  scenario: unknown,
  index: number,
  terminalPrefix: string
): { ok: true; data: BerthScenarioConfig } | { ok: false; error: string } {
  const prefix = `${terminalPrefix}.berth_scenarios[${index}]`

  if (!scenario || typeof scenario !== 'object') {
    return { ok: false, error: `${prefix} must be an object.` }
  }

  const s = scenario as Record<string, unknown>

  if (typeof s.berth_id !== 'string' || !s.berth_id) {
    return { ok: false, error: `${prefix}.berth_id must be a non-empty string.` }
  }
  if (typeof s.ops_enabled !== 'boolean') {
    return { ok: false, error: `${prefix}.ops_enabled must be a boolean.` }
  }
  if (typeof s.dc_enabled !== 'boolean') {
    return { ok: false, error: `${prefix}.dc_enabled must be a boolean.` }
  }

  return {
    ok: true,
    data: {
      berth_id: s.berth_id,
      ops_enabled: s.ops_enabled,
      dc_enabled: s.dc_enabled,
    },
  }
}

function validateBaselineEquipment(
  equipment: unknown,
  prefix: string
): { ok: true; data: Record<string, BaselineEquipmentEntry> } | { ok: false; error: string } {
  if (!equipment || typeof equipment !== 'object') {
    return { ok: false, error: `${prefix} must be an object.` }
  }

  const result: Record<string, BaselineEquipmentEntry> = {}
  const eqMap = equipment as Record<string, unknown>

  for (const [key, val] of Object.entries(eqMap)) {
    if (!val || typeof val !== 'object') {
      return { ok: false, error: `${prefix}.${key} must be an object with existing_diesel and existing_electric.` }
    }
    const entry = val as Record<string, unknown>

    const diesel = entry.existing_diesel
    const electric = entry.existing_electric

    if (typeof diesel !== 'number' || diesel < 0) {
      return { ok: false, error: `${prefix}.${key}.existing_diesel must be a non-negative number.` }
    }
    if (typeof electric !== 'number' || electric < 0) {
      return { ok: false, error: `${prefix}.${key}.existing_electric must be a non-negative number.` }
    }

    result[key] = { existing_diesel: diesel, existing_electric: electric }
  }

  return { ok: true, data: result }
}

function validateScenarioEquipment(
  equipment: unknown,
  prefix: string
): { ok: true; data: Record<string, ScenarioEquipmentEntry> } | { ok: false; error: string } {
  if (!equipment || typeof equipment !== 'object') {
    return { ok: false, error: `${prefix} must be an object.` }
  }

  const result: Record<string, ScenarioEquipmentEntry> = {}
  const eqMap = equipment as Record<string, unknown>

  for (const [key, val] of Object.entries(eqMap)) {
    if (!val || typeof val !== 'object') {
      return { ok: false, error: `${prefix}.${key} must be an object with num_to_convert and num_to_add.` }
    }
    const entry = val as Record<string, unknown>

    const convert = entry.num_to_convert
    const add = entry.num_to_add

    if (typeof convert !== 'number' || convert < 0) {
      return { ok: false, error: `${prefix}.${key}.num_to_convert must be a non-negative number.` }
    }
    if (typeof add !== 'number' || add < 0) {
      return { ok: false, error: `${prefix}.${key}.num_to_add must be a non-negative number.` }
    }

    result[key] = { num_to_convert: convert, num_to_add: add }
  }

  return { ok: true, data: result }
}

function validateBuildingsLighting(
  config: unknown,
  prefix: string
): { ok: true; data: BuildingsLightingConfig } | { ok: false; error: string } {
  if (!config || typeof config !== 'object') {
    return { ok: false, error: `${prefix} must be an object.` }
  }

  const c = config as Record<string, unknown>

  const fields = [
    'warehouse_sqm', 'office_sqm', 'workshop_sqm',
    'high_mast_lights', 'area_lights', 'roadway_lights',
    'annual_operating_hours'
  ] as const

  for (const field of fields) {
    if (typeof c[field] !== 'number' || c[field] < 0) {
      return { ok: false, error: `${prefix}.${field} must be a non-negative number.` }
    }
  }

  return {
    ok: true,
    data: {
      warehouse_sqm: c.warehouse_sqm as number,
      office_sqm: c.office_sqm as number,
      workshop_sqm: c.workshop_sqm as number,
      high_mast_lights: c.high_mast_lights as number,
      area_lights: c.area_lights as number,
      roadway_lights: c.roadway_lights as number,
      annual_operating_hours: c.annual_operating_hours as number,
    },
  }
}

function validateTerminal(
  terminal: unknown,
  index: number
): { ok: true; data: PieceTerminalConfig } | { ok: false; error: string } {
  const prefix = `terminals[${index}]`

  if (!terminal || typeof terminal !== 'object') {
    return { ok: false, error: `${prefix} must be an object.` }
  }

  const t = terminal as Record<string, unknown>

  if (typeof t.id !== 'string' || !t.id) {
    return { ok: false, error: `${prefix}.id must be a non-empty string.` }
  }
  if (typeof t.name !== 'string') {
    return { ok: false, error: `${prefix}.name must be a string.` }
  }
  if (typeof t.terminal_type !== 'string' || !VALID_TERMINAL_TYPES.includes(t.terminal_type as TerminalType)) {
    return { ok: false, error: `${prefix}.terminal_type must be one of: ${VALID_TERMINAL_TYPES.join(', ')}` }
  }
  if (typeof t.annual_teu !== 'number' || t.annual_teu < 0) {
    return { ok: false, error: `${prefix}.annual_teu must be non-negative.` }
  }

  // Berths (BerthDefinition[])
  if (!Array.isArray(t.berths)) {
    return { ok: false, error: `${prefix}.berths must be an array.` }
  }
  const berths: BerthDefinition[] = []
  for (let i = 0; i < t.berths.length; i++) {
    const berthValidation = validateBerthDefinition(t.berths[i], i, prefix)
    if (!berthValidation.ok) {
      return { ok: false, error: berthValidation.error }
    }
    berths.push(berthValidation.data)
  }

  // Berth scenarios (BerthScenarioConfig[]) - optional
  let berthScenarios: BerthScenarioConfig[] = []
  if (t.berth_scenarios !== undefined) {
    if (!Array.isArray(t.berth_scenarios)) {
      return { ok: false, error: `${prefix}.berth_scenarios must be an array if provided.` }
    }
    for (let i = 0; i < t.berth_scenarios.length; i++) {
      const scenarioValidation = validateBerthScenario(t.berth_scenarios[i], i, prefix)
      if (!scenarioValidation.ok) {
        return { ok: false, error: scenarioValidation.error }
      }
      berthScenarios.push(scenarioValidation.data)
    }
  }

  // Baseline equipment (Record<string, BaselineEquipmentEntry>)
  const baselineValidation = validateBaselineEquipment(t.baseline_equipment, `${prefix}.baseline_equipment`)
  if (!baselineValidation.ok) {
    return { ok: false, error: baselineValidation.error }
  }

  // Scenario equipment (Record<string, ScenarioEquipmentEntry>)
  const scenarioValidation = validateScenarioEquipment(t.scenario_equipment, `${prefix}.scenario_equipment`)
  if (!scenarioValidation.ok) {
    return { ok: false, error: scenarioValidation.error }
  }

  // Optional buildings_lighting
  let buildingsLighting: BuildingsLightingConfig | undefined
  if (t.buildings_lighting !== undefined) {
    const blValidation = validateBuildingsLighting(t.buildings_lighting, `${prefix}.buildings_lighting`)
    if (!blValidation.ok) {
      return { ok: false, error: blValidation.error }
    }
    buildingsLighting = blValidation.data
  }

  // Optional charger overrides
  let chargerOverrides: Record<string, number> | undefined
  if (t.charger_overrides !== undefined) {
    if (typeof t.charger_overrides !== 'object' || t.charger_overrides === null) {
      return { ok: false, error: `${prefix}.charger_overrides must be an object if provided.` }
    }
    chargerOverrides = {}
    for (const [key, val] of Object.entries(t.charger_overrides as Record<string, unknown>)) {
      if (typeof val !== 'number' || val < 0) {
        return { ok: false, error: `${prefix}.charger_overrides.${key} must be a non-negative number.` }
      }
      chargerOverrides[key] = val
    }
  }

  // Optional cable length
  let cableLengthM: number | undefined
  if (t.cable_length_m !== undefined) {
    if (typeof t.cable_length_m !== 'number' || t.cable_length_m < 0) {
      return { ok: false, error: `${prefix}.cable_length_m must be a non-negative number if provided.` }
    }
    cableLengthM = t.cable_length_m
  }

  return {
    ok: true,
    data: {
      id: t.id,
      name: t.name,
      terminal_type: t.terminal_type as TerminalType,
      annual_teu: t.annual_teu,
      annual_passengers: typeof t.annual_passengers === 'number' ? t.annual_passengers : undefined,
      annual_ceu: typeof t.annual_ceu === 'number' ? t.annual_ceu : undefined,
      berths,
      berth_scenarios: berthScenarios,
      baseline_equipment: baselineValidation.data,
      scenario_equipment: scenarioValidation.data,
      buildings_lighting: buildingsLighting,
      charger_overrides: chargerOverrides,
      cable_length_m: cableLengthM,
    },
  }
}

function validateRequest(
  body: unknown
): { ok: true; data: PieceCalculationRequest } | { ok: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'Request body must be a JSON object.' }
  }

  const req = body as Record<string, unknown>

  // ── Port ──
  if (!req.port || typeof req.port !== 'object') {
    return { ok: false, error: 'Missing "port" object.' }
  }
  const port = req.port as Record<string, unknown>

  if (typeof port.name !== 'string') {
    return { ok: false, error: 'port.name must be a string.' }
  }
  if (typeof port.location !== 'string') {
    return { ok: false, error: 'port.location must be a string.' }
  }
  if (typeof port.size_key !== 'string' || !VALID_SIZE_KEYS.includes(port.size_key)) {
    return { ok: false, error: `port.size_key must be one of: ${VALID_SIZE_KEYS.join(', ')}` }
  }

  // ── Terminals ──
  if (!Array.isArray(req.terminals) || req.terminals.length === 0) {
    return { ok: false, error: 'At least one terminal is required.' }
  }

  const terminals: PieceTerminalConfig[] = []
  for (let i = 0; i < req.terminals.length; i++) {
    const terminalValidation = validateTerminal(req.terminals[i], i)
    if (!terminalValidation.ok) {
      return { ok: false, error: terminalValidation.error }
    }
    terminals.push(terminalValidation.data)
  }

  // ── Port Services Baseline (optional) ──
  let portServicesBaseline: PortServicesBaseline | undefined
  if (req.port_services_baseline !== undefined) {
    const validation = validatePortServicesBaseline(req.port_services_baseline, 'port_services_baseline')
    if (!validation.ok) {
      return { ok: false, error: validation.error }
    }
    portServicesBaseline = validation.data
  }

  // ── Port Services Scenario (optional) ──
  let portServicesScenario: PortServicesScenario | undefined
  if (req.port_services_scenario !== undefined) {
    const validation = validatePortServicesScenario(req.port_services_scenario, 'port_services_scenario')
    if (!validation.ok) {
      return { ok: false, error: validation.error }
    }
    portServicesScenario = validation.data
  }

  // ── Buildings & Lighting (optional, port-level) ──
  let buildingsLighting: BuildingsLightingConfig | undefined
  if (req.buildings_lighting !== undefined) {
    const validation = validateBuildingsLighting(req.buildings_lighting, 'buildings_lighting')
    if (!validation.ok) {
      return { ok: false, error: validation.error }
    }
    buildingsLighting = validation.data
  }

  // ── Economic overrides (optional) ──
  let economicOverrides: Record<string, number> | undefined
  if (req.economic_overrides !== undefined) {
    if (typeof req.economic_overrides !== 'object' || req.economic_overrides === null) {
      return { ok: false, error: 'economic_overrides must be an object if provided.' }
    }
    economicOverrides = {}
    for (const [key, val] of Object.entries(req.economic_overrides as Record<string, unknown>)) {
      if (typeof val !== 'number') {
        return { ok: false, error: `economic_overrides.${key} must be a number.` }
      }
      economicOverrides[key] = val
    }
  }

  return {
    ok: true,
    data: {
      port: {
        name: port.name,
        location: port.location,
        size_key: port.size_key as '' | 'small_feeder' | 'regional' | 'hub' | 'mega_hub',
      },
      terminals,
      port_services_baseline: portServicesBaseline,
      port_services_scenario: portServicesScenario,
      buildings_lighting: buildingsLighting,
      economic_overrides: economicOverrides,
    },
  }
}

// ── Route handler ────────────────────────────────────────

export async function POST(request: Request) {
  try {
    // 1. Parse JSON body
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON body.' },
        { status: 400 }
      )
    }

    // 2. Validate request shape
    const validation = validateRequest(body)
    if (!validation.ok) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      )
    }

    const calcRequest = validation.data

    // 3. Load PIECE assumption data from Supabase (5 tables)
    const supabase = await createClient()
    const assumptions = await loadPieceAssumptions(supabase)

    // 4. Run PIECE calculation engine
    const result = calculatePortPiece(calcRequest, assumptions)

    // 5. Return response
    return NextResponse.json({ success: true, result })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    console.error('PIECE calculation error:', error)
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}
