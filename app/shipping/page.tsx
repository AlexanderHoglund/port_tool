'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import type {
  PortConfig,
  TerminalConfig,
  PortResult,
  CalculationRequest,
} from '@/lib/types'
import {
  INITIAL_PORT,
  EQUIPMENT_KEYS,
  TYPICAL_PORT_CONFIGS,
  createDefaultTerminal,
  resetTerminalCounter,
} from '@/lib/constants'
import PortIdentitySection from '@/components/shipping/PortIdentitySection'
import TerminalCard from '@/components/shipping/TerminalCard'
import ResultsSection from '@/components/shipping/ResultsSection'
import { exportToExcel } from '@/components/shipping/ExcelExport'

export default function EnergyTransitionPage() {
  // ── State ────────────────────────────────────────────
  const [port, setPort] = useState<PortConfig>(INITIAL_PORT)
  const [terminals, setTerminals] = useState<TerminalConfig[]>(() => {
    resetTerminalCounter()
    return [createDefaultTerminal()]
  })
  const [result, setResult] = useState<PortResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ── Terminal CRUD ────────────────────────────────────
  const addTerminal = useCallback(() => {
    setTerminals((prev) => [...prev, createDefaultTerminal()])
  }, [])

  const removeTerminal = useCallback((id: string) => {
    setTerminals((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const updateTerminal = useCallback(
    (id: string, updated: TerminalConfig) => {
      setTerminals((prev) =>
        prev.map((t) => (t.id === id ? updated : t)),
      )
    },
    [],
  )

  // ── Load typical values for the selected port size ──
  const loadTypicalValues = useCallback(() => {
    const cfg = TYPICAL_PORT_CONFIGS[port.size_key]
    if (!cfg) return

    resetTerminalCounter()

    const newTerminals: TerminalConfig[] = cfg.terminals.map((t) => {
      // Build full equipment records (zeros for all keys, overlay typical)
      const baselineEq: Record<string, number> = Object.fromEntries(
        EQUIPMENT_KEYS.map((k) => [k, t.equipment[k] ?? 0]),
      )
      // Scenario starts as a copy of baseline
      const scenarioEq = { ...baselineEq }

      return {
        id: crypto.randomUUID(),
        name: t.name,
        cargo_type: 'container' as const,
        onshore: {
          annual_teu: t.teu,
          terminal_area_ha: t.area_ha,
          baseline_equipment: baselineEq,
          scenario_equipment: scenarioEq,
          shore_power_connections: t.shore_power,
        },
        offshore: {
          vessel_calls: t.vessel_calls.map((vc) => ({ ...vc })),
          baseline_tugs: { type: 'diesel' as const, count: t.tug_count },
          scenario_tugs: { type: 'electric' as const, count: t.tug_count },
        },
      }
    })

    setTerminals(newTerminals)
    setResult(null)
  }, [port.size_key])

  // ── Calculate ────────────────────────────────────────
  const handleCalculate = async () => {
    setLoading(true)
    setError(null)

    try {
      const body: CalculationRequest = { port, terminals }

      const response = await fetch('/api/energy-transition/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        setError(data.error || 'Calculation failed')
        setResult(null)
      } else {
        setResult(data.result)
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An error occurred'
      setError(message)
      setResult(null)
    }

    setLoading(false)
  }

  // ── Validation ───────────────────────────────────────
  const canCalculate =
    port.size_key !== '' &&
    terminals.length > 0 &&
    terminals.some(
      (t) =>
        Object.values(t.onshore.baseline_equipment).some((q) => q > 0) ||
        Object.values(t.onshore.scenario_equipment).some((q) => q > 0) ||
        t.offshore.vessel_calls.length > 0,
    )

  // ── Render ───────────────────────────────────────────
  return (
    <div className="min-h-screen bg-white">
      {/* Header with logo */}
      <header className="w-full py-4 px-6 bg-white border-b border-gray-100">
        <Link href="/" className="inline-block">
          <Image
            src="/200w.gif"
            alt="Port Hub Tool Logo"
            width={120}
            height={40}
            className="h-10 w-auto"
            priority
          />
        </Link>
      </header>

      {/* Hero */}
      <div className="py-14" style={{ backgroundColor: '#e8f8fc' }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8 text-center">
          <h1 className="text-4xl font-extralight text-[#414141] mb-3 tracking-tight">
            Port Energy Transition Tool
          </h1>
          <p className="text-sm font-light text-[#585858] max-w-2xl mx-auto">
            Define your current port operations, model an electrified scenario,
            and compare CO&#8322; reduction, operating costs, and capital investment.
          </p>
        </div>
      </div>

      <div className="py-10" style={{ backgroundColor: '#f2f2f2' }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8 space-y-8">
          {/* Step 1: Port identity + load defaults */}
          <PortIdentitySection
            port={port}
            onChange={setPort}
            onLoadDefaults={loadTypicalValues}
          />

          {/* Step 2: Terminals */}
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-[11px] font-bold uppercase tracking-widest text-[#8c8c8c]">
                Terminals ({terminals.length})
              </h2>
              <button
                type="button"
                onClick={addTerminal}
                className="px-4 py-2 rounded-lg bg-[#3c5e86] text-white text-xs font-semibold hover:bg-[#2a4566] transition-colors"
              >
                + Add Terminal
              </button>
            </div>

            {terminals.map((terminal, idx) => (
              <TerminalCard
                key={terminal.id}
                terminal={terminal}
                onChange={(updated) => updateTerminal(terminal.id, updated)}
                onRemove={() => removeTerminal(terminal.id)}
                canRemove={terminals.length > 1}
                defaultCollapsed={terminals.length > 2 && idx > 0}
              />
            ))}
          </section>

          {/* Step 3: Calculate */}
          <div className="flex justify-center">
            <button
              onClick={handleCalculate}
              disabled={loading || !canCalculate}
              className="text-white font-medium text-sm py-3 px-12 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#2e4a6a]"
              style={{ backgroundColor: '#3c5e86' }}
            >
              {loading ? 'Calculating...' : 'Calculate Comparison'}
            </button>
          </div>

          {/* Error */}
          {error && (
            <div
              className="rounded-2xl text-[#9e5858] px-5 py-4 text-sm border"
              style={{
                backgroundColor: '#feeeea',
                borderColor: '#fac8c2',
              }}
            >
              <p className="font-medium">{error}</p>
            </div>
          )}

          {/* Empty state */}
          {!result && !error && canCalculate && (
            <div className="bg-white rounded-2xl p-12 border border-[#dcdcdc] text-center">
              <div className="text-[#bebebe] text-5xl mb-4">&#9889;</div>
              <p className="text-sm text-[#8c8c8c]">
                Configure your terminals above and click Calculate to compare
                baseline vs. electrified scenario
              </p>
            </div>
          )}

          {/* Step 4: Results */}
          {result && (
            <ResultsSection
              result={result}
              onExportExcel={() => exportToExcel(result)}
            />
          )}
        </div>
      </div>
    </div>
  )
}
