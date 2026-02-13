'use client'

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
  type Dispatch,
  type SetStateAction,
} from 'react'
import type {
  PortConfig,
  PieceTerminalConfig,
  PiecePortResult,
  BerthDefinition,
  ProjectBaseline,
  ScenarioConfig,
  ProjectRow,
  ScenarioRow,
  PortServicesBaseline,
  PortServicesScenario,
} from '@/lib/types'
import { computeAssumptionFingerprint } from '@/lib/assumption-hash'
import { reconstitutePieceTerminals, decomposePieceTerminals, createEmptyScenarioConfig } from '@/lib/piece-reconstitute'

// ── Terminal counter (shared across context lifecycle) ────

let terminalCounter = 0

export function createDefaultTerminal(): PieceTerminalConfig {
  terminalCounter++
  return {
    id: crypto.randomUUID(),
    name: `Terminal ${terminalCounter}`,
    terminal_type: 'container',
    annual_teu: 0,
    vessel_calls: [],
    berths: [],
    baseline_equipment: {},
    scenario_equipment: {},
    berth_scenarios: [],
  }
}

/** Reset counter and sync to a given terminal set (used after loading a scenario). */
function syncTerminalCounter(terminals: PieceTerminalConfig[]) {
  // Set counter to the max numeric suffix found in terminal names, or the count
  let max = terminals.length
  for (const t of terminals) {
    const m = t.name.match(/Terminal\s+(\d+)/i)
    if (m) max = Math.max(max, parseInt(m[1], 10))
  }
  terminalCounter = max
}

// ── Backward compatibility: migrate old berth formats ──
// Old berths may have vessel_calls arrays or flat fields. Both are lifted to terminal level.

function migrateTerminals(terminals: PieceTerminalConfig[]): PieceTerminalConfig[] {
  return terminals.map((t) => {
    // If terminal already has vessel_calls, just strip any leftover berth vessel_calls
    if (t.vessel_calls && t.vessel_calls.length > 0) {
      return {
        ...t,
        berths: t.berths.map((b) => {
          const raw = b as unknown as Record<string, unknown>
          // Strip vessel_calls from berth if present
          const { vessel_calls: _vc, ...rest } = raw
          return rest as unknown as BerthDefinition
        }),
      }
    }

    // Lift vessel_calls from berths to terminal level
    const liftedCalls: { id: string; vessel_segment_key: string; annual_calls: number; avg_berth_hours: number }[] = []
    const cleanedBerths: BerthDefinition[] = []

    for (const berth of t.berths) {
      const raw = berth as unknown as Record<string, unknown>

      if (Array.isArray(raw.vessel_calls)) {
        // Intermediate format: berth has vessel_calls array
        for (const call of raw.vessel_calls as { id?: string; vessel_segment_key: string; annual_calls: number; avg_berth_hours: number }[]) {
          liftedCalls.push({
            id: call.id ?? crypto.randomUUID(),
            vessel_segment_key: call.vessel_segment_key,
            annual_calls: call.annual_calls,
            avg_berth_hours: call.avg_berth_hours,
          })
        }
      } else if (raw.current_vessel_segment_key || raw.annual_calls) {
        // Very old format: flat fields on berth
        liftedCalls.push({
          id: crypto.randomUUID(),
          vessel_segment_key: (raw.current_vessel_segment_key as string) ?? (raw.max_vessel_segment_key as string) ?? '',
          annual_calls: (raw.annual_calls as number) ?? 0,
          avg_berth_hours: (raw.avg_berth_hours as number) ?? 0,
        })
      }

      cleanedBerths.push({
        id: (raw.id as string) ?? crypto.randomUUID(),
        berth_number: (raw.berth_number as number) ?? 1,
        berth_name: (raw.berth_name as string) ?? '',
        max_vessel_segment_key: (raw.max_vessel_segment_key as string) ?? '',
        ops_existing: !!raw.ops_existing,
        dc_existing: !!raw.dc_existing,
      })
    }

    return {
      ...t,
      vessel_calls: liftedCalls,
      berths: cleanedBerths,
    }
  })
}

// ── Initial state ────────────────────────────────────────

const INITIAL_PORT: PortConfig = { name: '', location: '', size_key: '' }

// ── Context types ────────────────────────────────────────

type PieceContextValue = {
  // Core state
  port: PortConfig
  terminals: PieceTerminalConfig[]
  result: PiecePortResult | null

  // Port-level offshore equipment
  portServicesBaseline: PortServicesBaseline | null
  portServicesScenario: PortServicesScenario | null

  // Project/scenario tracking
  activeProjectId: string | null
  activeProjectName: string | null
  activeScenarioId: string | null
  activeScenarioName: string | null
  activeAssumptionProfile: string    // 'default' or 'scenario_{uuid}'

  // Legacy loaded-scenario tracking (for backward compat with saved ports)
  loadedScenarioId: string | null
  loadedScenarioName: string | null

  // Stale detection
  isResultStale: boolean
  isBaselineDirty: boolean           // true when baseline edits invalidate ALL scenario results
  resultsClearedByAssumptions: boolean
  currentAssumptionFingerprint: string | null

  // Setters (inputs)
  setPort: (port: PortConfig) => void
  setTerminals: Dispatch<SetStateAction<PieceTerminalConfig[]>>
  setPortServicesBaseline: (ps: PortServicesBaseline | null) => void
  setPortServicesScenario: (ps: PortServicesScenario | null) => void
  /** Set result + record the assumption fingerprint at calculation time */
  setResult: (result: PiecePortResult | null, fingerprint?: string) => void
  markResultStale: () => void
  setLoadedScenario: (id: string | null, name: string | null) => void

  // Project/scenario actions
  loadProject: (project: ProjectRow) => void
  loadProjectScenario: (project: ProjectRow, scenario: ScenarioRow) => void
  setActiveProject: (id: string | null, name: string | null) => void
  setActiveScenario: (id: string | null, name: string | null, profile?: string) => void
  markBaselineDirty: () => void

  // Legacy actions
  loadScenario: (port: PortConfig, terminals: PieceTerminalConfig[], result: PiecePortResult | null, scenarioId?: string, scenarioName?: string) => void
  clearAll: () => void
  refreshAssumptionFingerprint: () => Promise<void>
}

const PieceContext = createContext<PieceContextValue | null>(null)

// ── Provider ─────────────────────────────────────────────

export function PieceProvider({ children }: { children: ReactNode }) {
  const [port, setPortRaw] = useState<PortConfig>(INITIAL_PORT)
  const [terminals, setTerminalsRaw] = useState<PieceTerminalConfig[]>(() => {
    terminalCounter = 0
    return [createDefaultTerminal()]
  })
  const [result, setResultInternal] = useState<PiecePortResult | null>(null)
  const [resultFingerprint, setResultFingerprint] = useState<string | null>(null)
  const [currentFingerprint, setCurrentFingerprint] = useState<string | null>(null)
  const [isResultStale, setIsResultStale] = useState(false)
  const [isBaselineDirty, setIsBaselineDirty] = useState(false)
  const [resultsClearedByAssumptions, setResultsClearedByAssumptions] = useState(false)
  const [loadedScenarioId, setLoadedScenarioId] = useState<string | null>(null)
  const [loadedScenarioName, setLoadedScenarioName] = useState<string | null>(null)

  // Port-level offshore equipment
  const [portServicesBaseline, setPortServicesBaselineRaw] = useState<PortServicesBaseline | null>(null)
  const [portServicesScenario, setPortServicesScenarioRaw] = useState<PortServicesScenario | null>(null)

  // Project/scenario tracking
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null)
  const [activeProjectName, setActiveProjectName] = useState<string | null>(null)
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null)
  const [activeScenarioName, setActiveScenarioName] = useState<string | null>(null)
  const [activeAssumptionProfile, setActiveAssumptionProfile] = useState<string>('default')

  // Track whether an input changed since last calculation
  const inputGeneration = useRef(0)
  const resultGeneration = useRef(0)

  // ── Stale / assumption-clear detection ──

  useEffect(() => {
    // Assumption fingerprint changed since calculation? → clear results entirely
    if (result && resultFingerprint && currentFingerprint && resultFingerprint !== currentFingerprint) {
      setResultInternal(null)
      setResultsClearedByAssumptions(true)
      setIsResultStale(false)
      return
    }
    // Reset the cleared-by-assumptions flag once fingerprints are back in sync
    // (e.g. after switching scenarios and the new profile fingerprint loads)
    if (resultFingerprint && currentFingerprint && resultFingerprint === currentFingerprint) {
      setResultsClearedByAssumptions(false)
    }
    if (!result) {
      setIsResultStale(false)
      return
    }
    // Input changed since calculation?
    if (inputGeneration.current !== resultGeneration.current) {
      setIsResultStale(true)
      return
    }
    setIsResultStale(false)
  }, [result, resultFingerprint, currentFingerprint])

  // ── Wrapped setters that track input changes ──

  const setPort = useCallback((p: PortConfig) => {
    setPortRaw(p)
    inputGeneration.current++
  }, [])

  const setTerminals: Dispatch<SetStateAction<PieceTerminalConfig[]>> = useCallback(
    (action: SetStateAction<PieceTerminalConfig[]>) => {
      setTerminalsRaw(action)
      inputGeneration.current++
    },
    [],
  )

  const setPortServicesBaseline = useCallback((ps: PortServicesBaseline | null) => {
    setPortServicesBaselineRaw(ps)
    inputGeneration.current++
  }, [])

  const setPortServicesScenario = useCallback((ps: PortServicesScenario | null) => {
    setPortServicesScenarioRaw(ps)
    inputGeneration.current++
  }, [])

  const setResult = useCallback((r: PiecePortResult | null, fingerprint?: string) => {
    setResultInternal(r)
    if (fingerprint) {
      setResultFingerprint(fingerprint)
    }
    // Snapshot the current input generation so we know inputs haven't changed
    resultGeneration.current = inputGeneration.current
    if (r) {
      setIsResultStale(false)
      setResultsClearedByAssumptions(false)
    }
  }, [])

  const markResultStale = useCallback(() => setIsResultStale(true), [])

  const setLoadedScenario = useCallback((id: string | null, name: string | null) => {
    setLoadedScenarioId(id)
    setLoadedScenarioName(name)
  }, [])

  // ── Assumption fingerprint (uses activeAssumptionProfile) ──

  const refreshAssumptionFingerprint = useCallback(async () => {
    const fp = await computeAssumptionFingerprint(activeAssumptionProfile)
    setCurrentFingerprint(fp)
  }, [activeAssumptionProfile])

  // Fetch initial fingerprint
  useEffect(() => {
    refreshAssumptionFingerprint()
  }, [refreshAssumptionFingerprint])

  // ── Load a saved scenario ──

  const loadScenario = useCallback(
    (p: PortConfig, t: PieceTerminalConfig[], r: PiecePortResult | null, scenarioId?: string, scenarioName?: string) => {
      const migrated = migrateTerminals(t)
      setPortRaw(p)
      setTerminalsRaw(migrated)
      syncTerminalCounter(migrated)
      setResultInternal(r)
      setLoadedScenarioId(scenarioId ?? null)
      setLoadedScenarioName(scenarioName ?? null)
      // Loaded results may be stale (assumptions could have changed since save)
      setResultFingerprint(null)
      inputGeneration.current++
      resultGeneration.current = inputGeneration.current
      setIsResultStale(r !== null) // mark stale if there are results to show
    },
    [],
  )

  // ── Project/scenario setters ──

  const setActiveProject = useCallback((id: string | null, name: string | null) => {
    setActiveProjectId(id)
    setActiveProjectName(name)
  }, [])

  const setActiveScenario = useCallback((id: string | null, name: string | null, profile?: string) => {
    setActiveScenarioId(id)
    setActiveScenarioName(name)
    if (profile) setActiveAssumptionProfile(profile)
  }, [])

  const markBaselineDirty = useCallback(() => {
    setIsBaselineDirty(true)
  }, [])

  // ── Load a project (no scenario selected) ──

  const loadProject = useCallback((project: ProjectRow) => {
    const portCfg = project.port_config
    setPortRaw(portCfg)
    // Create empty terminals from baseline (no scenario data yet)
    const emptyScenario = createEmptyScenarioConfig(project.baseline_config)
    const { terminals: reconstituted, portServicesBaseline: psBaseline } =
      reconstitutePieceTerminals(project.baseline_config, emptyScenario)
    setTerminalsRaw(reconstituted)
    syncTerminalCounter(reconstituted)
    setPortServicesBaselineRaw(psBaseline)
    setPortServicesScenarioRaw(null)
    setResultInternal(null)
    setResultFingerprint(null)
    inputGeneration.current++
    resultGeneration.current = inputGeneration.current
    setIsResultStale(false)
    setIsBaselineDirty(false)
    setResultsClearedByAssumptions(false)
    // Project tracking
    setActiveProjectId(project.id)
    setActiveProjectName(project.project_name)
    setActiveScenarioId(null)
    setActiveScenarioName(null)
    setActiveAssumptionProfile('default')
    // Clear legacy
    setLoadedScenarioId(null)
    setLoadedScenarioName(null)
  }, [])

  // ── Load a project + specific scenario ──

  const loadProjectScenario = useCallback((project: ProjectRow, scenario: ScenarioRow) => {
    const portCfg = project.port_config
    setPortRaw(portCfg)
    // Reconstitute flat terminals from baseline + scenario
    const { terminals: reconstituted, portServicesBaseline: psBaseline, portServicesScenario: psScenario } =
      reconstitutePieceTerminals(project.baseline_config, scenario.scenario_config)
    const migrated = migrateTerminals(reconstituted)
    setTerminalsRaw(migrated)
    syncTerminalCounter(migrated)
    setPortServicesBaselineRaw(psBaseline)
    setPortServicesScenarioRaw(psScenario)
    setResultInternal(scenario.result)
    setResultFingerprint(scenario.assumption_hash ?? null)
    // Optimistically set currentFingerprint to the saved hash so the stale
    // detection effect doesn't see a mismatch during the async window before
    // refreshAssumptionFingerprint completes.  The async refresh will correct
    // this if assumptions actually changed since the result was saved.
    setCurrentFingerprint(scenario.assumption_hash ?? null)
    inputGeneration.current++
    resultGeneration.current = inputGeneration.current
    setIsResultStale(false)
    setIsBaselineDirty(false)
    setResultsClearedByAssumptions(false)
    // Project + scenario tracking
    setActiveProjectId(project.id)
    setActiveProjectName(project.project_name)
    setActiveScenarioId(scenario.id)
    setActiveScenarioName(scenario.scenario_name)
    setActiveAssumptionProfile(scenario.assumption_profile)
    // Clear legacy
    setLoadedScenarioId(null)
    setLoadedScenarioName(null)
  }, [])

  // ── Clear all ──

  const clearAll = useCallback(() => {
    setPortRaw(INITIAL_PORT)
    terminalCounter = 0
    setTerminalsRaw([createDefaultTerminal()])
    setPortServicesBaselineRaw(null)
    setPortServicesScenarioRaw(null)
    setResultInternal(null)
    setResultFingerprint(null)
    inputGeneration.current = 0
    resultGeneration.current = 0
    setIsResultStale(false)
    setIsBaselineDirty(false)
    setResultsClearedByAssumptions(false)
    setLoadedScenarioId(null)
    setLoadedScenarioName(null)
    // Clear project/scenario
    setActiveProjectId(null)
    setActiveProjectName(null)
    setActiveScenarioId(null)
    setActiveScenarioName(null)
    setActiveAssumptionProfile('default')
  }, [])

  return (
    <PieceContext.Provider
      value={{
        port,
        terminals,
        result,
        portServicesBaseline,
        portServicesScenario,
        activeProjectId,
        activeProjectName,
        activeScenarioId,
        activeScenarioName,
        activeAssumptionProfile,
        loadedScenarioId,
        loadedScenarioName,
        isResultStale,
        isBaselineDirty,
        resultsClearedByAssumptions,
        currentAssumptionFingerprint: currentFingerprint,
        setPort,
        setTerminals,
        setPortServicesBaseline,
        setPortServicesScenario,
        setResult,
        markResultStale,
        setLoadedScenario,
        loadProject,
        loadProjectScenario,
        setActiveProject,
        setActiveScenario,
        markBaselineDirty,
        loadScenario,
        clearAll,
        refreshAssumptionFingerprint,
      }}
    >
      {children}
    </PieceContext.Provider>
  )
}

// ── Hook ─────────────────────────────────────────────────

export function usePieceContext(): PieceContextValue {
  const ctx = useContext(PieceContext)
  if (!ctx) throw new Error('usePieceContext must be used within PieceProvider')
  return ctx
}
