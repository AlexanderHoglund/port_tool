/**
 * CRUD operations for the piece_saved_ports table.
 * Stores complete port configurations (inputs + results) as JSONB.
 */

import { createClient } from '@/utils/supabase/client'
import type { PortConfig, PieceTerminalConfig, PiecePortResult } from './types'

// ── Types ────────────────────────────────────────────────

export type SavedPortRow = {
  id: string
  scenario_name: string
  description: string | null
  port_name: string
  port_location: string
  port_size_key: string
  terminal_count: number
  port_config: PortConfig
  terminals_config: PieceTerminalConfig[]
  result: PiecePortResult | null
  assumption_profile: string
  assumption_hash: string | null
  created_at: string
  updated_at: string
}

export type SavedPortSummary = {
  id: string
  scenario_name: string
  description: string | null
  port_name: string
  port_location: string
  port_size_key: string
  terminal_count: number
  assumption_profile: string
  created_at: string
  updated_at: string
  total_capex_usd?: number
  co2_reduction_percent?: number
}

// ── List (for Saved Ports page) ──────────────────────────

export async function listSavedPorts(): Promise<SavedPortSummary[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('piece_saved_ports')
    .select('id, scenario_name, description, port_name, port_location, port_size_key, terminal_count, assumption_profile, created_at, updated_at, result')
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Failed to list saved ports: ${error.message}`)

  return (data ?? []).map((row) => {
    const result = row.result as PiecePortResult | null
    return {
      id: row.id,
      scenario_name: row.scenario_name,
      description: row.description,
      port_name: row.port_name,
      port_location: row.port_location,
      port_size_key: row.port_size_key,
      terminal_count: row.terminal_count,
      assumption_profile: row.assumption_profile,
      created_at: row.created_at,
      updated_at: row.updated_at,
      total_capex_usd: result?.totals?.total_capex_usd,
      co2_reduction_percent: result?.totals?.co2_reduction_percent,
    }
  })
}

// ── Load single (for loading into dashboard) ─────────────

export async function loadSavedPort(id: string): Promise<SavedPortRow> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('piece_saved_ports')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw new Error(`Failed to load saved port: ${error.message}`)
  return data as SavedPortRow
}

// ── Save ─────────────────────────────────────────────────

export async function savePort(params: {
  scenario_name: string
  description?: string
  port: PortConfig
  terminals: PieceTerminalConfig[]
  result: PiecePortResult | null
  assumption_profile?: string
  assumption_hash?: string
}): Promise<string> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('piece_saved_ports')
    .insert({
      scenario_name: params.scenario_name,
      description: params.description ?? null,
      port_name: params.port.name,
      port_location: params.port.location,
      port_size_key: params.port.size_key,
      terminal_count: params.terminals.length,
      port_config: params.port,
      terminals_config: params.terminals,
      result: params.result,
      assumption_profile: params.assumption_profile ?? 'default',
      assumption_hash: params.assumption_hash ?? null,
    })
    .select('id')
    .single()

  if (error) throw new Error(`Failed to save port: ${error.message}`)
  return data.id
}

// ── Update (overwrite existing) ─────────────────────────

export async function updateSavedPort(id: string, params: {
  scenario_name: string
  description?: string
  port: PortConfig
  terminals: PieceTerminalConfig[]
  result: PiecePortResult | null
  assumption_hash?: string
}): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('piece_saved_ports')
    .update({
      scenario_name: params.scenario_name,
      description: params.description ?? null,
      port_name: params.port.name,
      port_location: params.port.location,
      port_size_key: params.port.size_key,
      terminal_count: params.terminals.length,
      port_config: params.port,
      terminals_config: params.terminals,
      result: params.result,
      assumption_hash: params.assumption_hash ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) throw new Error(`Failed to update: ${error.message}`)
}

// ── Delete ───────────────────────────────────────────────

export async function deleteSavedPort(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('piece_saved_ports')
    .delete()
    .eq('id', id)

  if (error) throw new Error(`Failed to delete: ${error.message}`)
}
