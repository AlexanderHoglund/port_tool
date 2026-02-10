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
import type { PortConfig, PieceTerminalConfig, PiecePortResult } from '@/lib/types'
import { computeAssumptionFingerprint } from '@/lib/assumption-hash'

// ── Terminal counter (shared across context lifecycle) ────

let terminalCounter = 0

export function createDefaultTerminal(): PieceTerminalConfig {
  terminalCounter++
  return {
    id: crypto.randomUUID(),
    name: `Terminal ${terminalCounter}`,
    terminal_type: 'container',
    annual_teu: 0,
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

// ── Initial state ────────────────────────────────────────

const INITIAL_PORT: PortConfig = { name: '', location: '', size_key: '' }

// ── Context types ────────────────────────────────────────

type PieceContextValue = {
  // Core state
  port: PortConfig
  terminals: PieceTerminalConfig[]
  result: PiecePortResult | null

  // Stale detection
  isResultStale: boolean
  resultsClearedByAssumptions: boolean
  currentAssumptionFingerprint: string | null

  // Setters (inputs)
  setPort: (port: PortConfig) => void
  setTerminals: Dispatch<SetStateAction<PieceTerminalConfig[]>>
  /** Set result + record the assumption fingerprint at calculation time */
  setResult: (result: PiecePortResult | null, fingerprint?: string) => void
  markResultStale: () => void

  // Actions
  loadScenario: (port: PortConfig, terminals: PieceTerminalConfig[], result: PiecePortResult | null) => void
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
  const [resultsClearedByAssumptions, setResultsClearedByAssumptions] = useState(false)

  // Track whether an input changed since last calculation
  const inputGeneration = useRef(0)
  const resultGeneration = useRef(0)

  // ── Stale / assumption-clear detection ──

  useEffect(() => {
    if (!result) {
      setIsResultStale(false)
      return
    }
    // Assumption fingerprint changed since calculation? → clear results entirely
    if (resultFingerprint && currentFingerprint && resultFingerprint !== currentFingerprint) {
      setResultInternal(null)
      setResultsClearedByAssumptions(true)
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

  // ── Assumption fingerprint ──

  const refreshAssumptionFingerprint = useCallback(async () => {
    const fp = await computeAssumptionFingerprint()
    setCurrentFingerprint(fp)
  }, [])

  // Fetch initial fingerprint
  useEffect(() => {
    refreshAssumptionFingerprint()
  }, [refreshAssumptionFingerprint])

  // ── Load a saved scenario ──

  const loadScenario = useCallback(
    (p: PortConfig, t: PieceTerminalConfig[], r: PiecePortResult | null) => {
      setPortRaw(p)
      setTerminalsRaw(t)
      syncTerminalCounter(t)
      setResultInternal(r)
      // Loaded results may be stale (assumptions could have changed since save)
      setResultFingerprint(null)
      inputGeneration.current++
      resultGeneration.current = inputGeneration.current
      setIsResultStale(r !== null) // mark stale if there are results to show
    },
    [],
  )

  // ── Clear all ──

  const clearAll = useCallback(() => {
    setPortRaw(INITIAL_PORT)
    terminalCounter = 0
    setTerminalsRaw([createDefaultTerminal()])
    setResultInternal(null)
    setResultFingerprint(null)
    inputGeneration.current = 0
    resultGeneration.current = 0
    setIsResultStale(false)
    setResultsClearedByAssumptions(false)
  }, [])

  return (
    <PieceContext.Provider
      value={{
        port,
        terminals,
        result,
        isResultStale,
        resultsClearedByAssumptions,
        currentAssumptionFingerprint: currentFingerprint,
        setPort,
        setTerminals,
        setResult,
        markResultStale,
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
