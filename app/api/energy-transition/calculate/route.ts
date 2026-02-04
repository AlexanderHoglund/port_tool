/**
 * ═══════════════════════════════════════════════════════════
 * API ROUTE — POST /api/energy-transition/calculate
 * ═══════════════════════════════════════════════════════════
 *
 * Thin orchestration layer that:
 *   1. Parses & validates the CalculationRequest body
 *   2. Loads all assumption tables from Supabase
 *   3. Runs the pure calculation engine
 *   4. Returns a CalculationResponse
 *
 * No business logic lives here — see lib/calculation-engine.ts.
 * ═══════════════════════════════════════════════════════════
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { loadAllAssumptions } from '@/lib/load-assumptions'
import { calculatePort } from '@/lib/calculation-engine'
import { EQUIPMENT_KEYS } from '@/lib/constants'
import type { CalculationRequest } from '@/lib/types'

// ── Valid enum values ────────────────────────────────────
const VALID_SIZE_KEYS = ['small_feeder', 'regional', 'hub', 'mega_hub']

// ── Validation helpers ───────────────────────────────────

function validateRequest(body: unknown): { ok: true; data: CalculationRequest } | { ok: false; error: string } {
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

  for (let i = 0; i < req.terminals.length; i++) {
    const t = req.terminals[i] as Record<string, unknown>
    const prefix = `terminals[${i}]`

    if (typeof t.id !== 'string' || !t.id) {
      return { ok: false, error: `${prefix}.id must be a non-empty string.` }
    }
    if (typeof t.name !== 'string') {
      return { ok: false, error: `${prefix}.name must be a string.` }
    }

    // ── Onshore ──
    const on = t.onshore as Record<string, unknown> | undefined
    if (!on || typeof on !== 'object') {
      return { ok: false, error: `${prefix}.onshore must be an object.` }
    }
    if (typeof on.annual_teu !== 'number' || on.annual_teu < 0) {
      return { ok: false, error: `${prefix}.onshore.annual_teu must be a non-negative number.` }
    }

    // Shore power connections (onshore infrastructure)
    if (typeof on.shore_power_connections !== 'number' || on.shore_power_connections < 0) {
      return { ok: false, error: `${prefix}.onshore.shore_power_connections must be non-negative.` }
    }

    // Validate equipment records
    for (const field of ['baseline_equipment', 'scenario_equipment'] as const) {
      const eq = on[field]
      if (!eq || typeof eq !== 'object') {
        return { ok: false, error: `${prefix}.onshore.${field} must be an object.` }
      }
      const eqMap = eq as Record<string, unknown>
      for (const [key, val] of Object.entries(eqMap)) {
        if (!EQUIPMENT_KEYS.includes(key)) {
          return { ok: false, error: `${prefix}.onshore.${field}: unknown equipment key "${key}".` }
        }
        if (typeof val !== 'number' || val < 0) {
          return { ok: false, error: `${prefix}.onshore.${field}.${key} must be a non-negative number.` }
        }
      }
    }

    // ── Offshore ──
    const off = t.offshore as Record<string, unknown> | undefined
    if (!off || typeof off !== 'object') {
      return { ok: false, error: `${prefix}.offshore must be an object.` }
    }

    // Vessel calls
    if (!Array.isArray(off.vessel_calls)) {
      return { ok: false, error: `${prefix}.offshore.vessel_calls must be an array.` }
    }
    for (let j = 0; j < off.vessel_calls.length; j++) {
      const vc = off.vessel_calls[j] as Record<string, unknown>
      if (typeof vc.vessel_type !== 'string' || !vc.vessel_type) {
        return { ok: false, error: `${prefix}.offshore.vessel_calls[${j}].vessel_type must be a non-empty string.` }
      }
      if (typeof vc.annual_calls !== 'number' || vc.annual_calls < 0) {
        return { ok: false, error: `${prefix}.offshore.vessel_calls[${j}].annual_calls must be non-negative.` }
      }
      if (typeof vc.avg_berth_hours !== 'number' || vc.avg_berth_hours < 0) {
        return { ok: false, error: `${prefix}.offshore.vessel_calls[${j}].avg_berth_hours must be non-negative.` }
      }
    }

    // Tug configs
    for (const field of ['baseline_tugs', 'scenario_tugs'] as const) {
      const tug = off[field] as Record<string, unknown> | undefined
      if (!tug || typeof tug !== 'object') {
        return { ok: false, error: `${prefix}.offshore.${field} must be an object.` }
      }
      if (!['diesel', 'hybrid', 'electric'].includes(tug.type as string)) {
        return { ok: false, error: `${prefix}.offshore.${field}.type must be diesel, hybrid, or electric.` }
      }
      if (typeof tug.count !== 'number' || tug.count < 0) {
        return { ok: false, error: `${prefix}.offshore.${field}.count must be non-negative.` }
      }
    }

  }

  return { ok: true, data: req as unknown as CalculationRequest }
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
        { status: 400 },
      )
    }

    // 2. Validate request shape
    const validation = validateRequest(body)
    if (!validation.ok) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 },
      )
    }

    const calcRequest = validation.data

    // 3. Load all assumption data from Supabase (6 tables in parallel)
    const supabase = await createClient()
    const assumptions = await loadAllAssumptions(supabase)

    // 4. Run pure calculation engine
    const result = calculatePort(calcRequest, assumptions)

    // 5. Return response
    return NextResponse.json({ success: true, result })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    console.error('Energy transition calculation error:', error)
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    )
  }
}
