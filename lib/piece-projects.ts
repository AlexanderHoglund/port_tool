/**
 * CRUD operations for the piece_projects and piece_scenarios tables.
 * Projects store shared port baseline; scenarios store electrification choices + assumptions.
 */

import { createClient } from '@/utils/supabase/client'
import type {
  PortConfig,
  ProjectBaseline,
  ProjectRow,
  ProjectSummary,
  ScenarioConfig,
  ScenarioRow,
  ScenarioSummary,
  PiecePortResult,
  ScenarioTerminalConfig,
  BerthScenarioConfig,
  ScenarioEquipmentEntry,
} from './types'

// ═══════════════════════════════════════════════════════════
// PROJECT CRUD
// ═══════════════════════════════════════════════════════════

/** List all projects with scenario counts */
export async function listProjects(): Promise<ProjectSummary[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('piece_projects')
    .select('id, project_name, description, port_name, port_location, port_size_key, terminal_count, created_at, updated_at')
    .order('updated_at', { ascending: false })

  if (error) throw new Error(`Failed to list projects: ${error.message}`)

  // Get scenario counts per project
  const projectIds = (data ?? []).map((p) => p.id)
  let scenarioCounts: Record<string, number> = {}

  if (projectIds.length > 0) {
    const { data: counts, error: countError } = await supabase
      .from('piece_scenarios')
      .select('project_id')
      .in('project_id', projectIds)

    if (!countError && counts) {
      scenarioCounts = counts.reduce((acc, row) => {
        acc[row.project_id] = (acc[row.project_id] ?? 0) + 1
        return acc
      }, {} as Record<string, number>)
    }
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    project_name: row.project_name,
    description: row.description,
    port_name: row.port_name,
    port_location: row.port_location,
    port_size_key: row.port_size_key,
    terminal_count: row.terminal_count,
    scenario_count: scenarioCounts[row.id] ?? 0,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }))
}

/** Load a single project (full row) */
export async function loadProject(id: string): Promise<ProjectRow> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('piece_projects')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw new Error(`Failed to load project: ${error.message}`)
  return data as ProjectRow
}

/** Create a new project, returns project id */
export async function createProject(params: {
  project_name: string
  description?: string
  port: PortConfig
  baseline: ProjectBaseline
}): Promise<string> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('piece_projects')
    .insert({
      project_name: params.project_name,
      description: params.description ?? null,
      port_name: params.port.name,
      port_location: params.port.location,
      port_size_key: params.port.size_key,
      terminal_count: params.baseline.terminals.length,
      port_config: params.port,
      baseline_config: params.baseline,
    })
    .select('id')
    .single()

  if (error) throw new Error(`Failed to create project: ${error.message}`)
  return data.id
}

/** Update project baseline (invalidates all scenario results) */
export async function updateProjectBaseline(id: string, params: {
  project_name?: string
  description?: string
  port?: PortConfig
  baseline?: ProjectBaseline
}): Promise<void> {
  const supabase = createClient()
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }

  if (params.project_name !== undefined) updates.project_name = params.project_name
  if (params.description !== undefined) updates.description = params.description
  if (params.port) {
    updates.port_name = params.port.name
    updates.port_location = params.port.location
    updates.port_size_key = params.port.size_key
    updates.port_config = params.port
  }
  if (params.baseline) {
    updates.baseline_config = params.baseline
    updates.terminal_count = params.baseline.terminals.length
  }

  const { error } = await supabase
    .from('piece_projects')
    .update(updates)
    .eq('id', id)

  if (error) throw new Error(`Failed to update project: ${error.message}`)
}

/** Delete a project (CASCADE deletes scenarios) */
export async function deleteProject(id: string): Promise<void> {
  const supabase = createClient()

  // First delete all assumption overrides for this project's scenarios
  const { data: scenarios } = await supabase
    .from('piece_scenarios')
    .select('assumption_profile')
    .eq('project_id', id)

  if (scenarios) {
    const profiles = scenarios.map((s) => s.assumption_profile)
    if (profiles.length > 0) {
      await supabase
        .from('piece_assumption_overrides')
        .delete()
        .in('profile_name', profiles)
    }
  }

  // Delete the project (scenarios cascade)
  const { error } = await supabase
    .from('piece_projects')
    .delete()
    .eq('id', id)

  if (error) throw new Error(`Failed to delete project: ${error.message}`)
}

// ═══════════════════════════════════════════════════════════
// SCENARIO CRUD
// ═══════════════════════════════════════════════════════════

/** List scenarios for a project */
export async function listScenarios(projectId: string): Promise<ScenarioSummary[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('piece_scenarios')
    .select('id, project_id, scenario_name, description, sort_order, assumption_profile, result, created_at, updated_at')
    .eq('project_id', projectId)
    .order('sort_order', { ascending: true })

  if (error) throw new Error(`Failed to list scenarios: ${error.message}`)

  return (data ?? []).map((row) => {
    const result = row.result as PiecePortResult | null
    return {
      id: row.id,
      project_id: row.project_id,
      scenario_name: row.scenario_name,
      description: row.description,
      sort_order: row.sort_order,
      assumption_profile: row.assumption_profile,
      has_result: result !== null,
      total_capex_usd: result?.totals?.total_capex_usd,
      co2_reduction_percent: result?.totals?.co2_reduction_percent,
      annual_opex_savings_usd: result?.totals?.annual_opex_savings_usd,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }
  })
}

/** Load a single scenario (full row) */
export async function loadScenario(id: string): Promise<ScenarioRow> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('piece_scenarios')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw new Error(`Failed to load scenario: ${error.message}`)
  return data as ScenarioRow
}

/** Create a new scenario. Profile name = 'scenario_{uuid}'. Returns scenario id. */
export async function createScenario(params: {
  project_id: string
  scenario_name: string
  description?: string
  scenario_config: ScenarioConfig
  sort_order?: number
}): Promise<string> {
  const supabase = createClient()

  // Get next sort_order if not provided
  let sortOrder = params.sort_order
  if (sortOrder === undefined) {
    const { data: existing } = await supabase
      .from('piece_scenarios')
      .select('sort_order')
      .eq('project_id', params.project_id)
      .order('sort_order', { ascending: false })
      .limit(1)
    sortOrder = (existing?.[0]?.sort_order ?? -1) + 1
  }

  const { data, error } = await supabase
    .from('piece_scenarios')
    .insert({
      project_id: params.project_id,
      scenario_name: params.scenario_name,
      description: params.description ?? null,
      sort_order: sortOrder,
      scenario_config: params.scenario_config,
      result: null,
      assumption_profile: '__placeholder__', // will be updated below
      assumption_hash: null,
    })
    .select('id')
    .single()

  if (error) throw new Error(`Failed to create scenario: ${error.message}`)

  // Update assumption_profile to use the generated id
  const profile = `scenario_${data.id}`
  const { error: updateError } = await supabase
    .from('piece_scenarios')
    .update({ assumption_profile: profile })
    .eq('id', data.id)

  if (updateError) throw new Error(`Failed to set scenario profile: ${updateError.message}`)

  return data.id
}

/** Update a scenario's config and/or result */
export async function updateScenario(id: string, params: {
  scenario_name?: string
  description?: string
  scenario_config?: ScenarioConfig
  result?: PiecePortResult | null
  assumption_hash?: string | null
}): Promise<void> {
  const supabase = createClient()
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }

  if (params.scenario_name !== undefined) updates.scenario_name = params.scenario_name
  if (params.description !== undefined) updates.description = params.description
  if (params.scenario_config !== undefined) updates.scenario_config = params.scenario_config
  if (params.result !== undefined) updates.result = params.result
  if (params.assumption_hash !== undefined) updates.assumption_hash = params.assumption_hash

  const { error } = await supabase
    .from('piece_scenarios')
    .update(updates)
    .eq('id', id)

  if (error) throw new Error(`Failed to update scenario: ${error.message}`)
}

/** Duplicate a scenario (copies config + assumption overrides). Returns new scenario id. */
export async function duplicateScenario(id: string, newName: string): Promise<string> {
  const supabase = createClient()

  // Load source scenario
  const source = await loadScenario(id)

  // Create new scenario
  const newId = await createScenario({
    project_id: source.project_id,
    scenario_name: newName,
    description: source.description ?? undefined,
    scenario_config: source.scenario_config,
  })

  // Copy assumption overrides from source to new profile
  const newProfile = `scenario_${newId}`
  await copyAssumptionProfile(source.assumption_profile, newProfile)

  return newId
}

/** Delete a scenario and its assumption overrides */
export async function deleteScenario(id: string): Promise<void> {
  const supabase = createClient()

  // Get the scenario's profile name first
  const { data: scenario } = await supabase
    .from('piece_scenarios')
    .select('assumption_profile')
    .eq('id', id)
    .single()

  if (scenario) {
    await deleteAssumptionProfile(scenario.assumption_profile)
  }

  const { error } = await supabase
    .from('piece_scenarios')
    .delete()
    .eq('id', id)

  if (error) throw new Error(`Failed to delete scenario: ${error.message}`)
}

// ═══════════════════════════════════════════════════════════
// ASSUMPTION PROFILE HELPERS
// ═══════════════════════════════════════════════════════════

/** Copy all overrides from one profile to another */
export async function copyAssumptionProfile(
  sourceProfile: string,
  targetProfile: string,
): Promise<void> {
  const supabase = createClient()

  const { data: overrides, error: fetchError } = await supabase
    .from('piece_assumption_overrides')
    .select('table_name, row_key, column_name, custom_value')
    .eq('profile_name', sourceProfile)

  if (fetchError) throw new Error(`Failed to copy profile: ${fetchError.message}`)
  if (!overrides || overrides.length === 0) return

  const rows = overrides.map((o) => ({
    profile_name: targetProfile,
    table_name: o.table_name,
    row_key: o.row_key,
    column_name: o.column_name,
    custom_value: o.custom_value,
  }))

  const { error: insertError } = await supabase
    .from('piece_assumption_overrides')
    .insert(rows)

  if (insertError) throw new Error(`Failed to insert profile overrides: ${insertError.message}`)
}

/** Delete all overrides for a profile */
export async function deleteAssumptionProfile(profileName: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('piece_assumption_overrides')
    .delete()
    .eq('profile_name', profileName)

  if (error) throw new Error(`Failed to delete profile overrides: ${error.message}`)
}

// ═══════════════════════════════════════════════════════════
// BATCH OPERATIONS
// ═══════════════════════════════════════════════════════════

/** Invalidate all scenario results for a project (baseline changed) */
export async function invalidateAllScenarioResults(projectId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('piece_scenarios')
    .update({ result: null, updated_at: new Date().toISOString() })
    .eq('project_id', projectId)

  if (error) throw new Error(`Failed to invalidate results: ${error.message}`)
}

/**
 * Sync ALL scenario_configs for a project to align with a new baseline.
 * - New terminals: added with empty electrification
 * - Removed terminals: pruned from scenario_config
 * - Existing terminals: berths synced, equipment num_to_convert capped, orphans removed
 * Operations data (throughput + vessel calls) lives in baseline, not scenarios.
 * Also invalidates all results (sets result=null) since configs changed.
 */
export async function syncScenariosWithBaseline(
  projectId: string,
  newBaseline: ProjectBaseline,
): Promise<void> {
  const supabase = createClient()

  // Load all scenario rows (only id + scenario_config)
  const { data: scenarios, error: fetchErr } = await supabase
    .from('piece_scenarios')
    .select('id, scenario_config')
    .eq('project_id', projectId)

  if (fetchErr) throw new Error(`Failed to load scenarios for sync: ${fetchErr.message}`)
  if (!scenarios || scenarios.length === 0) return

  // For each scenario, compute synced scenario_config
  const updates: { id: string; scenario_config: ScenarioConfig }[] = []

  for (const scenarioRow of scenarios) {
    const oldConfig = scenarioRow.scenario_config as ScenarioConfig
    const oldTerminalMap = new Map(
      oldConfig.terminals.map((st: ScenarioTerminalConfig) => [st.terminal_id, st])
    )

    const newTerminals: ScenarioTerminalConfig[] = []

    for (const bt of newBaseline.terminals) {
      const existingSt = oldTerminalMap.get(bt.id)

      if (!existingSt) {
        // NEW TERMINAL: not in scenario yet — empty electrification
        newTerminals.push({
          terminal_id: bt.id,
          scenario_equipment: {},
          berth_scenarios: bt.berths.map(b => ({
            berth_id: b.id,
            ops_enabled: false,
            dc_enabled: false,
          })),
        })
      } else {
        // EXISTING TERMINAL: sync berths, equipment

        // a) Sync berth_scenarios: keep existing, add new, removed berths auto-dropped
        const existingBerthMap = new Map(
          (existingSt.berth_scenarios ?? []).map((bs: BerthScenarioConfig) => [bs.berth_id, bs])
        )
        const syncedBerthScenarios: BerthScenarioConfig[] = bt.berths.map(b => {
          const existing = existingBerthMap.get(b.id)
          return existing ?? { berth_id: b.id, ops_enabled: false, dc_enabled: false }
        })

        // b) Sync scenario_equipment: cap num_to_convert, drop removed keys
        const syncedEquipment: Record<string, ScenarioEquipmentEntry> = {}
        for (const [eqKey, eqEntry] of Object.entries(existingSt.scenario_equipment)) {
          const baselineEq = bt.baseline_equipment[eqKey]
          if (!baselineEq) continue // equipment removed from baseline
          syncedEquipment[eqKey] = {
            num_to_convert: Math.min(
              (eqEntry as ScenarioEquipmentEntry).num_to_convert,
              baselineEq.existing_diesel,
            ),
            num_to_add: (eqEntry as ScenarioEquipmentEntry).num_to_add,
          }
        }

        newTerminals.push({
          terminal_id: existingSt.terminal_id,
          scenario_equipment: syncedEquipment,
          berth_scenarios: syncedBerthScenarios,
          charger_overrides: existingSt.charger_overrides,
        })
      }
    }
    // Terminals in old scenario but NOT in new baseline are simply omitted (removed)

    updates.push({
      id: scenarioRow.id,
      scenario_config: {
        terminals: newTerminals,
        port_services_scenario: oldConfig.port_services_scenario,
      },
    })
  }

  // Batch update: set synced config + invalidate result for each scenario
  const now = new Date().toISOString()
  await Promise.all(
    updates.map(({ id, scenario_config }) =>
      supabase
        .from('piece_scenarios')
        .update({ scenario_config, result: null, updated_at: now })
        .eq('id', id)
    )
  )
}
