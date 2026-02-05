/**
 * ═══════════════════════════════════════════════════════════
 * API ROUTE — POST /api/piece/calculate
 * ═══════════════════════════════════════════════════════════
 *
 * PIECE (Port Infrastructure for Electric & Clean Energy) calculation API.
 *
 * Key differences from /api/energy-transition/calculate:
 *   - Uses throughput-based formula (kWh/TEU × throughput)
 *   - Supports multi-terminal types (container, cruise, roro, port_services)
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
  BerthConfig,
} from '@/lib/types'

// ── Valid enum values ────────────────────────────────────
const VALID_SIZE_KEYS = ['', 'small_feeder', 'regional', 'hub', 'mega_hub']
const VALID_TERMINAL_TYPES: TerminalType[] = ['container', 'cruise', 'roro', 'port_services']

// ── Validation helpers ───────────────────────────────────

function validateBerth(
  berth: unknown,
  index: number,
  terminalPrefix: string
): { ok: true; data: BerthConfig } | { ok: false; error: string } {
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
  if (typeof b.vessel_segment_key !== 'string' || !b.vessel_segment_key) {
    return { ok: false, error: `${prefix}.vessel_segment_key must be a non-empty string.` }
  }
  if (typeof b.annual_calls !== 'number' || b.annual_calls < 0) {
    return { ok: false, error: `${prefix}.annual_calls must be non-negative.` }
  }
  if (typeof b.avg_berth_hours !== 'number' || b.avg_berth_hours < 0) {
    return { ok: false, error: `${prefix}.avg_berth_hours must be non-negative.` }
  }
  if (typeof b.ops_enabled !== 'boolean') {
    return { ok: false, error: `${prefix}.ops_enabled must be a boolean.` }
  }
  if (typeof b.dc_enabled !== 'boolean') {
    return { ok: false, error: `${prefix}.dc_enabled must be a boolean.` }
  }

  return {
    ok: true,
    data: {
      id: b.id,
      berth_number: b.berth_number,
      berth_name: b.berth_name,
      vessel_segment_key: b.vessel_segment_key,
      annual_calls: b.annual_calls,
      avg_berth_hours: b.avg_berth_hours,
      ops_enabled: b.ops_enabled,
      dc_enabled: b.dc_enabled,
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

  // Berths
  if (!Array.isArray(t.berths)) {
    return { ok: false, error: `${prefix}.berths must be an array.` }
  }
  const berths: BerthConfig[] = []
  for (let i = 0; i < t.berths.length; i++) {
    const berthValidation = validateBerth(t.berths[i], i, prefix)
    if (!berthValidation.ok) {
      return { ok: false, error: berthValidation.error }
    }
    berths.push(berthValidation.data)
  }

  // Equipment records
  for (const field of ['baseline_equipment', 'scenario_equipment'] as const) {
    const eq = t[field]
    if (!eq || typeof eq !== 'object') {
      return { ok: false, error: `${prefix}.${field} must be an object.` }
    }
    const eqMap = eq as Record<string, unknown>
    for (const [key, val] of Object.entries(eqMap)) {
      if (typeof val !== 'number' || val < 0) {
        return { ok: false, error: `${prefix}.${field}.${key} must be a non-negative number.` }
      }
    }
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

  // Optional tugs (for port_services type)
  let tugs: { diesel_count: number; electric_count: number } | undefined
  if (t.tugs !== undefined) {
    if (!t.tugs || typeof t.tugs !== 'object') {
      return { ok: false, error: `${prefix}.tugs must be an object if provided.` }
    }
    const tugObj = t.tugs as Record<string, unknown>
    if (typeof tugObj.diesel_count !== 'number' || tugObj.diesel_count < 0) {
      return { ok: false, error: `${prefix}.tugs.diesel_count must be non-negative.` }
    }
    if (typeof tugObj.electric_count !== 'number' || tugObj.electric_count < 0) {
      return { ok: false, error: `${prefix}.tugs.electric_count must be non-negative.` }
    }
    tugs = {
      diesel_count: tugObj.diesel_count,
      electric_count: tugObj.electric_count,
    }
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
      baseline_equipment: t.baseline_equipment as Record<string, number>,
      scenario_equipment: t.scenario_equipment as Record<string, number>,
      charger_overrides: chargerOverrides,
      cable_length_m: cableLengthM,
      tugs,
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
