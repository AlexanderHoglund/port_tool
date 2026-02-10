'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import type {
  PieceCalculationRequest,
  TerminalType,
  BaselineEquipmentEntry,
  ScenarioEquipmentEntry,
  BerthDefinition,
  BerthScenarioConfig,
} from '@/lib/types'
import PortIdentitySection from '@/components/shipping/PortIdentitySection'
import PieceTerminalCard from '@/components/shipping/PieceTerminalCard'
import PieceResultsSection from '@/components/shipping/PieceResultsSection'
import { usePieceContext, createDefaultTerminal } from './context/PieceContext'
import { savePort } from '@/lib/piece-saved-ports'
import { createClient } from '@/utils/supabase/client'

export default function PiecePage() {
  // ── Context (persistent across tab navigation) ──
  const {
    port, setPort,
    terminals, setTerminals,
    result, setResult,
    resultsClearedByAssumptions,
    currentAssumptionFingerprint,
    refreshAssumptionFingerprint,
  } = usePieceContext()

  // ── Local transient state ──
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [saveName, setSaveName] = useState('')
  const [saveDescription, setSaveDescription] = useState('')
  const [saving, setSaving] = useState(false)

  // Refresh assumption fingerprint when returning to this page
  useEffect(() => {
    refreshAssumptionFingerprint()
  }, [refreshAssumptionFingerprint])

  // Fetch override summary for display under calculate button
  const OVERRIDE_TABLE_LABELS: Record<string, string> = {
    economic_assumptions: 'Economic',
    piece_equipment: 'Equipment',
    piece_evse: 'EVSE',
    piece_fleet_ops: 'Vessel & OPS',
    piece_grid: 'Grid',
  }
  const [overrideSummary, setOverrideSummary] = useState<{ table: string; count: number }[]>([])

  useEffect(() => {
    async function fetchOverrides() {
      const supabase = createClient()
      const { data } = await supabase
        .from('piece_assumption_overrides')
        .select('table_name')
        .eq('profile_name', 'default')
      if (data && data.length > 0) {
        const counts: Record<string, number> = {}
        for (const row of data) {
          counts[row.table_name] = (counts[row.table_name] || 0) + 1
        }
        setOverrideSummary(
          Object.entries(counts).map(([table, count]) => ({ table, count }))
        )
      } else {
        setOverrideSummary([])
      }
    }
    fetchOverrides()
  }, [currentAssumptionFingerprint])

  // Refs for scrolling
  const section1Ref = useRef<HTMLDivElement>(null)
  const section2Ref = useRef<HTMLDivElement>(null)
  const section3Ref = useRef<HTMLDivElement>(null)

  // Terminal CRUD
  const addTerminal = useCallback(() => {
    setTerminals((prev) => [...prev, createDefaultTerminal()])
  }, [setTerminals])

  const removeTerminal = useCallback((id: string) => {
    setTerminals((prev) => prev.filter((t) => t.id !== id))
  }, [setTerminals])

  const updateTerminal = useCallback((id: string, updated: typeof terminals[number]) => {
    setTerminals((prev) => prev.map((t) => (t.id === id ? updated : t)))
  }, [setTerminals])

  // Scroll to section
  const scrollToSection = (ref: React.RefObject<HTMLDivElement | null>) => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // Grid-powered equipment (always electric)
  const GRID_POWERED_EQUIPMENT = ['mhc', 'sts', 'rmg', 'rtg', 'asc', 'reefer']

  // Load typical values based on port size
  const loadTypicalValues = useCallback(() => {
    if (!port.size_key) return

    type TerminalDef = {
      name: string
      type: TerminalType
      teu: number
      berths: { segment: string; calls: number; hours: number }[]
      equipment: Record<string, number>  // Total counts
      cableLength: number

    }

    type PortDef = {
      terminals: TerminalDef[]
      portServices: { tugs: number; pilotBoats: number }
    }

    const portConfigs: Record<string, PortDef> = {
      small_feeder: {
        terminals: [
          {
            name: 'Container Terminal',
            type: 'container',
            teu: 100000,
            berths: [
              { segment: 'container_0_3k', calls: 180, hours: 18 },
              { segment: 'container_3_6k', calls: 120, hours: 24 },
            ],
            equipment: {
              mhc: 2,
              tt: 8,
              rs: 2,
              ech: 1,
              reefer: 50,
            },
            cableLength: 400,

          },
        ],
        portServices: { tugs: 2, pilotBoats: 1 },
      },

      regional: {
        terminals: [
          {
            name: 'Main Container Terminal',
            type: 'container',
            teu: 500000,
            berths: [
              { segment: 'container_3_6k', calls: 200, hours: 20 },
              { segment: 'container_3_6k', calls: 180, hours: 22 },
              { segment: 'container_6_10k', calls: 150, hours: 28 },
              { segment: 'container_6_10k', calls: 140, hours: 30 },
            ],
            equipment: {
              sts: 4,
              rtg: 12,
              tt: 20,
              ech: 4,
              rs: 4,
              reefer: 200,
            },
            cableLength: 800,

          },
        ],
        portServices: { tugs: 4, pilotBoats: 2 },
      },

      hub: {
        terminals: [
          {
            name: 'Container Terminal North',
            type: 'container',
            teu: 1200000,
            berths: [
              { segment: 'container_6_10k', calls: 250, hours: 26 },
              { segment: 'container_6_10k', calls: 240, hours: 28 },
              { segment: 'container_10k_plus', calls: 180, hours: 32 },
              { segment: 'container_10k_plus', calls: 170, hours: 34 },
            ],
            equipment: {
              sts: 8,
              rmg: 16,
              agv: 24,
              ech: 4,
              rs: 3,
              sc: 8,
              reefer: 400,
            },
            cableLength: 1200,

          },
          {
            name: 'Container Terminal South',
            type: 'container',
            teu: 800000,
            berths: [
              { segment: 'container_3_6k', calls: 280, hours: 20 },
              { segment: 'container_6_10k', calls: 220, hours: 26 },
              { segment: 'container_6_10k', calls: 200, hours: 28 },
              { segment: 'container_10k_plus', calls: 150, hours: 32 },
            ],
            equipment: {
              sts: 6,
              rtg: 18,
              tt: 30,
              ech: 6,
              rs: 4,
              reefer: 350,
            },
            cableLength: 1000,

          },
        ],
        portServices: { tugs: 6, pilotBoats: 3 },
      },

      mega_hub: {
        terminals: [
          {
            name: 'Automated Terminal Alpha',
            type: 'container',
            teu: 2000000,
            berths: [
              { segment: 'container_10k_plus', calls: 320, hours: 30 },
              { segment: 'container_10k_plus', calls: 310, hours: 32 },
              { segment: 'container_10k_plus', calls: 300, hours: 32 },
              { segment: 'container_10k_plus', calls: 290, hours: 34 },
              { segment: 'container_10k_plus', calls: 280, hours: 34 },
            ],
            equipment: {
              sts: 12,
              asc: 30,
              agv: 50,
              ech: 6,
              rs: 4,
              reefer: 600,
            },
            cableLength: 1800,

          },
          {
            name: 'Automated Terminal Beta',
            type: 'container',
            teu: 1800000,
            berths: [
              { segment: 'container_6_10k', calls: 280, hours: 26 },
              { segment: 'container_10k_plus', calls: 300, hours: 30 },
              { segment: 'container_10k_plus', calls: 290, hours: 32 },
              { segment: 'container_10k_plus', calls: 280, hours: 32 },
              { segment: 'container_10k_plus', calls: 270, hours: 34 },
            ],
            equipment: {
              sts: 10,
              asc: 25,
              agv: 40,
              ech: 5,
              rs: 3,
              reefer: 500,
            },
            cableLength: 1600,

          },
          {
            name: 'Conventional Terminal',
            type: 'container',
            teu: 1200000,
            berths: [
              { segment: 'container_3_6k', calls: 320, hours: 18 },
              { segment: 'container_6_10k', calls: 260, hours: 24 },
              { segment: 'container_6_10k', calls: 240, hours: 26 },
              { segment: 'container_6_10k', calls: 220, hours: 28 },
              { segment: 'container_10k_plus', calls: 180, hours: 30 },
              { segment: 'container_10k_plus', calls: 160, hours: 32 },
            ],
            equipment: {
              sts: 10,
              rmg: 24,
              tt: 50,
              sc: 20,
              ech: 8,
              rs: 6,
              reefer: 450,
            },
            cableLength: 1400,

          },
        ],
        portServices: { tugs: 10, pilotBoats: 4 },
      },
    }

    const portDef = portConfigs[port.size_key]
    if (!portDef) return

    // Distribute port services across terminals (all on first terminal)
    const totalTugs = portDef.portServices.tugs
    const totalPilotBoats = portDef.portServices.pilotBoats

    const newTerminals = portDef.terminals.map((termDef, termIdx) => {
      // Create berth definitions (baseline)
      const berths: BerthDefinition[] = termDef.berths.map((berthDef, idx) => ({
        id: crypto.randomUUID(),
        berth_number: idx + 1,
        berth_name: `Berth ${idx + 1}`,
        max_vessel_segment_key: berthDef.segment,
        current_vessel_segment_key: berthDef.segment,
        annual_calls: berthDef.calls,
        avg_berth_hours: berthDef.hours,
        ops_existing: false,
        dc_existing: false,
      }))

      // Create berth scenarios (all OPS enabled by default)
      const berth_scenarios: BerthScenarioConfig[] = berths.map((b) => ({
        berth_id: b.id,
        ops_enabled: true,
        dc_enabled: false,
      }))

      // Create baseline equipment with diesel/electric split
      const baseline_equipment: Record<string, BaselineEquipmentEntry> = {}
      for (const [key, qty] of Object.entries(termDef.equipment)) {
        if (GRID_POWERED_EQUIPMENT.includes(key)) {
          baseline_equipment[key] = { existing_diesel: 0, existing_electric: qty }
        } else {
          baseline_equipment[key] = { existing_diesel: qty, existing_electric: 0 }
        }
      }

      // Create scenario equipment (convert all diesel by default)
      const scenario_equipment: Record<string, ScenarioEquipmentEntry> = {}
      for (const [key, qty] of Object.entries(termDef.equipment)) {
        if (GRID_POWERED_EQUIPMENT.includes(key)) {
          scenario_equipment[key] = { num_to_convert: 0, num_to_add: 0 }
        } else {
          scenario_equipment[key] = { num_to_convert: qty, num_to_add: 0 }
        }
      }

      return {
        id: crypto.randomUUID(),
        name: termDef.name,
        terminal_type: termDef.type,
        annual_teu: termDef.teu,

        berths,
        berth_scenarios,
        baseline_equipment,
        scenario_equipment,
        cable_length_m: termDef.cableLength,
        // Port services go on the first terminal
        port_services_baseline: termIdx === 0 ? {
          tugs_diesel: totalTugs,
          tugs_electric: 0,
          pilot_boats_diesel: totalPilotBoats,
          pilot_boats_electric: 0,
        } : undefined,
        port_services_scenario: termIdx === 0 ? {
          tugs_to_convert: totalTugs,
          tugs_to_add: 0,
          pilot_boats_to_convert: totalPilotBoats,
          pilot_boats_to_add: 0,
        } : undefined,
      }
    })

    setTerminals(newTerminals)
    setResult(null)
  }, [port.size_key, setTerminals, setResult])

  // Calculate
  const handleCalculate = async () => {
    setLoading(true)
    setError(null)

    try {
      // Aggregate port services from all terminals for the API
      const aggBaseline = { tugs_diesel: 0, tugs_electric: 0, pilot_boats_diesel: 0, pilot_boats_electric: 0 }
      const aggScenario = { tugs_to_convert: 0, tugs_to_add: 0, pilot_boats_to_convert: 0, pilot_boats_to_add: 0 }
      for (const t of terminals) {
        if (t.port_services_baseline) {
          aggBaseline.tugs_diesel += t.port_services_baseline.tugs_diesel
          aggBaseline.tugs_electric += t.port_services_baseline.tugs_electric
          aggBaseline.pilot_boats_diesel += t.port_services_baseline.pilot_boats_diesel
          aggBaseline.pilot_boats_electric += t.port_services_baseline.pilot_boats_electric
        }
        if (t.port_services_scenario) {
          aggScenario.tugs_to_convert += t.port_services_scenario.tugs_to_convert
          aggScenario.tugs_to_add += t.port_services_scenario.tugs_to_add
          aggScenario.pilot_boats_to_convert += t.port_services_scenario.pilot_boats_to_convert
          aggScenario.pilot_boats_to_add += t.port_services_scenario.pilot_boats_to_add
        }
      }

      const body: PieceCalculationRequest = {
        port,
        terminals,
        port_services_baseline: aggBaseline,
        port_services_scenario: aggScenario,
      }

      const response = await fetch('/api/piece/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        setError(data.error || 'Calculation failed')
        setResult(null)
      } else {
        // Pass the current assumption fingerprint so stale detection works
        setResult(data.result, currentAssumptionFingerprint ?? undefined)
        setTimeout(() => scrollToSection(section3Ref), 100)
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An error occurred'
      setError(message)
      setResult(null)
    }

    setLoading(false)
  }

  // Save scenario
  const handleSave = async () => {
    if (!saveName.trim()) return
    setSaving(true)
    try {
      await savePort({
        scenario_name: saveName.trim(),
        description: saveDescription.trim() || undefined,
        port,
        terminals,
        result,
        assumption_hash: currentAssumptionFingerprint ?? undefined,
      })
      setShowSaveDialog(false)
      setSaveName('')
      setSaveDescription('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    }
    setSaving(false)
  }

  // Validation - check if any equipment has been configured
  const hasBaselineEquipment = (eq: Record<string, BaselineEquipmentEntry>) =>
    Object.values(eq).some((e) => (e?.existing_diesel || 0) + (e?.existing_electric || 0) > 0)

  const hasScenarioChanges = (eq: Record<string, ScenarioEquipmentEntry>) =>
    Object.values(eq).some((e) => (e?.num_to_convert || 0) + (e?.num_to_add || 0) > 0)

  const canCalculate =
    terminals.length > 0 &&
    terminals.some(
      (t) =>
        t.annual_teu > 0 &&
        (hasBaselineEquipment(t.baseline_equipment) ||
          hasScenarioChanges(t.scenario_equipment) ||
          t.berths.length > 0)
    )

  // Check section completion status
  const isSection1Complete = port.size_key !== '' && terminals.some(t =>
    t.annual_teu > 0 && hasBaselineEquipment(t.baseline_equipment)
  )
  const isSection2Complete = terminals.some(t =>
    hasScenarioChanges(t.scenario_equipment) ||
    (t.berth_scenarios?.some(b => b.ops_enabled) ?? false)
  )

  return (
    <>
      {/* Progress Indicator - Sticky */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-[#dcdcdc] sticky top-20 z-10">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-center py-4 gap-2">
            <button
              onClick={() => scrollToSection(section1Ref)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                isSection1Complete
                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                  : 'bg-[#d4eefa] text-[#3c5e86]'
              }`}
            >
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  isSection1Complete
                    ? 'bg-green-600 text-white'
                    : 'bg-[#3c5e86] text-white'
                }`}
              >
                {isSection1Complete ? '\u2713' : '1'}
              </span>
              <span className="text-sm font-medium">Define Baseline</span>
            </button>

            <div className="w-8 h-0.5 bg-[#bebebe]" />

            <button
              onClick={() => scrollToSection(section2Ref)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                isSection2Complete
                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                  : isSection1Complete
                  ? 'bg-[#dcf0d6] text-[#286464]'
                  : 'bg-[#f2f2f2] text-[#8c8c8c] hover:bg-[#dcdcdc]'
              }`}
            >
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  isSection2Complete
                    ? 'bg-green-600 text-white'
                    : isSection1Complete
                    ? 'bg-[#286464] text-white'
                    : 'bg-[#8c8c8c] text-white'
                }`}
              >
                {isSection2Complete ? '\u2713' : '2'}
              </span>
              <span className="text-sm font-medium">Create Scenario</span>
            </button>

            <div className="w-8 h-0.5 bg-[#bebebe]" />

            <button
              onClick={() => scrollToSection(section3Ref)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                result
                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                  : isSection2Complete
                  ? 'bg-[#fceec8] text-[#bc8e54]'
                  : 'bg-[#f2f2f2] text-[#8c8c8c] hover:bg-[#dcdcdc]'
              }`}
            >
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  result
                    ? 'bg-green-600 text-white'
                    : isSection2Complete
                    ? 'bg-[#bc8e54] text-white'
                    : 'bg-[#8c8c8c] text-white'
                }`}
              >
                {result ? '\u2713' : '3'}
              </span>
              <span className="text-sm font-medium">Results</span>
            </button>
          </div>
        </div>
      </div>

      <div className="py-10">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 space-y-12">
          {/* ═══════════════════════════════════════════════════════════════════════
              SECTION 1: DEFINE PORT BASELINE
             ═══════════════════════════════════════════════════════════════════════ */}
          <div ref={section1Ref} className="scroll-mt-36 bg-[#e8f8fc] rounded-2xl p-8 border border-[#d4eefa]">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-full bg-[#3c5e86] text-white flex items-center justify-center text-sm font-bold">
                1
              </div>
              <div>
                <h2 className="text-xl font-semibold text-[#414141]">Define Port Baseline</h2>
                <p className="text-sm text-[#8c8c8c]">Configure your current port setup - terminal types, throughput, and existing equipment</p>
              </div>
            </div>

            <div className="space-y-6">
              {/* Port identity */}
              <PortIdentitySection
                port={port}
                onChange={setPort}
                onLoadDefaults={loadTypicalValues}
              />

              {/* Terminals - Baseline Mode */}
              <section className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-[11px] font-bold uppercase tracking-widest text-[#8c8c8c]">
                    Terminals ({terminals.length})
                  </h3>
                  <button
                    type="button"
                    onClick={addTerminal}
                    className="px-4 py-2 rounded-lg bg-[#3c5e86] text-white text-xs font-semibold hover:bg-[#68a4c2] transition-colors"
                  >
                    + Add Terminal
                  </button>
                </div>

                {terminals.map((terminal, idx) => (
                  <PieceTerminalCard
                    key={`baseline-${terminal.id}`}
                    terminal={terminal}
                    onChange={(updated) => updateTerminal(terminal.id, updated)}
                    onRemove={() => removeTerminal(terminal.id)}
                    canRemove={terminals.length > 1}
                    defaultCollapsed={terminals.length > 2 && idx > 0}
                    mode="baseline"
                  />
                ))}
              </section>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════════
              SECTION 2: CREATE ELECTRIFICATION SCENARIO
             ═══════════════════════════════════════════════════════════════════════ */}
          <div ref={section2Ref} className="scroll-mt-36 bg-[#eefae8] rounded-2xl p-8 border border-[#dcf0d6]">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-full bg-[#286464] text-white flex items-center justify-center text-sm font-bold">
                2
              </div>
              <div>
                <h2 className="text-xl font-semibold text-[#414141]">Create Electrification Scenario</h2>
                <p className="text-sm text-[#8c8c8c]">Configure what you want to electrify - equipment, shore power berths, chargers, and grid infrastructure</p>
              </div>
            </div>

            <div className="space-y-6">
              {/* Terminals - Scenario Mode */}
              <section className="space-y-6">
                <h3 className="text-[11px] font-bold uppercase tracking-widest text-[#8c8c8c]">
                  Terminal Electrification
                </h3>

                {terminals.map((terminal, idx) => (
                  <PieceTerminalCard
                    key={`scenario-${terminal.id}`}
                    terminal={terminal}
                    onChange={(updated) => updateTerminal(terminal.id, updated)}
                    defaultCollapsed={terminals.length > 2 && idx > 0}
                    mode="scenario"
                  />
                ))}
              </section>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════════
              SECTION 3: RESULTS
             ═══════════════════════════════════════════════════════════════════════ */}
          <div ref={section3Ref} className="scroll-mt-36 bg-[#fcf8e4] rounded-2xl p-8 border border-[#fceec8]">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-full bg-[#bc8e54] text-white flex items-center justify-center text-sm font-bold">
                3
              </div>
              <div>
                <h2 className="text-xl font-semibold text-[#414141]">Results</h2>
                <p className="text-sm text-[#8c8c8c]">Compare baseline vs electrified scenario - CAPEX, OPEX, CO2 savings, and payback period</p>
              </div>
            </div>

            {/* Calculate button + Save */}
            <div className="flex flex-col items-center gap-2 mb-8">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleCalculate}
                  disabled={loading || !canCalculate}
                  className="text-white font-medium text-sm py-3 px-12 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-[#414141] hover:bg-[#585858]"
                >
                  {loading ? 'Calculating...' : 'Calculate PIECE Analysis'}
                </button>
                {result && (
                  <button
                    onClick={() => {
                      setSaveName(port.name ? `${port.name} scenario` : 'Untitled scenario')
                      setShowSaveDialog(true)
                    }}
                    className="py-3 px-6 rounded-xl border border-[#bebebe] text-sm font-medium text-[#414141] hover:bg-white/60 transition-colors"
                  >
                    Save Scenario
                  </button>
                )}
              </div>

              {/* Assumption changed prompt */}
              {resultsClearedByAssumptions && (
                <p className="text-xs text-[#bc8e54] font-medium">
                  Assumptions have changed &mdash; please recalculate
                </p>
              )}

              {/* Custom assumptions info */}
              {overrideSummary.length > 0 && (
                <p className="text-[10px] text-[#8c8c8c]">
                  Custom assumptions: {overrideSummary.map((s) =>
                    `${OVERRIDE_TABLE_LABELS[s.table] ?? s.table} (${s.count})`
                  ).join(', ')}
                </p>
              )}
            </div>

            {/* Save dialog */}
            {showSaveDialog && (
              <div className="bg-white rounded-xl border border-[#dcdcdc] p-6 mb-6 max-w-md mx-auto">
                <h4 className="text-sm font-semibold text-[#414141] mb-4">Save Scenario</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-[#585858] mb-1">Name</label>
                    <input
                      type="text"
                      value={saveName}
                      onChange={(e) => setSaveName(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-[#414141] bg-white focus:border-[#68a4c2] focus:ring-2 focus:ring-[#d4eefa] focus:outline-none"
                      placeholder="e.g. Rotterdam Hub - Full Electrification"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#585858] mb-1">Description (optional)</label>
                    <input
                      type="text"
                      value={saveDescription}
                      onChange={(e) => setSaveDescription(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-[#414141] bg-white focus:border-[#68a4c2] focus:ring-2 focus:ring-[#d4eefa] focus:outline-none"
                      placeholder="Notes about this scenario..."
                    />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={handleSave}
                      disabled={saving || !saveName.trim()}
                      className="px-6 py-2 rounded-lg bg-[#414141] text-white text-sm font-medium hover:bg-[#585858] transition-colors disabled:opacity-40"
                    >
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={() => setShowSaveDialog(false)}
                      className="px-4 py-2 rounded-lg text-sm text-[#8c8c8c] hover:text-[#414141] transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div
                className="rounded-2xl text-[#9e5858] px-5 py-4 text-sm border mb-6"
                style={{ backgroundColor: '#feeeea', borderColor: '#fac8c2' }}
              >
                <p className="font-medium">{error}</p>
              </div>
            )}

            {/* Empty state */}
            {!result && !error && canCalculate && (
              <div className="bg-white/70 rounded-2xl p-12 border border-[#fceec8] text-center">
                {resultsClearedByAssumptions ? (
                  <>
                    <div className="text-[#bc8e54] text-5xl mb-4">&#9888;</div>
                    <p className="text-sm text-[#414141] font-medium mb-1">
                      Assumptions have been updated
                    </p>
                    <p className="text-xs text-[#8c8c8c]">
                      Previous results were cleared. Click Calculate to run a new analysis with the updated assumptions.
                    </p>
                  </>
                ) : (
                  <>
                    <div className="text-[#bebebe] text-5xl mb-4">&#9889;</div>
                    <p className="text-sm text-[#8c8c8c]">
                      Configure your baseline and scenario above, then click Calculate to see PIECE analysis
                    </p>
                  </>
                )}
              </div>
            )}

            {!result && !error && !canCalculate && (
              <div className="bg-white/70 rounded-2xl p-12 border border-[#fceec8] text-center">
                <div className="text-[#bebebe] text-5xl mb-4">&#128203;</div>
                <p className="text-sm text-[#8c8c8c]">
                  Please configure at least one terminal with throughput and equipment to enable calculation
                </p>
              </div>
            )}

            {/* Results */}
            {result && <PieceResultsSection result={result} />}
          </div>
        </div>
      </div>
    </>
  )
}
