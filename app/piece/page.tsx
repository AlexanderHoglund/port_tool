'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import type {
  PieceCalculationRequest,
  TerminalType,
  BaselineEquipmentEntry,
  ScenarioEquipmentEntry,
  BerthDefinition,
  BerthScenarioConfig,
  ScenarioSummary,
  ScenarioConfig,
} from '@/lib/types'
import PortIdentitySection from '@/components/shipping/PortIdentitySection'
import PieceTerminalCard from '@/components/shipping/PieceTerminalCard'
import PieceResultsSection from '@/components/shipping/PieceResultsSection'
import DashboardTabs, { type DashboardTab } from '@/components/shipping/DashboardTabs'
import ScenarioSubTabs from '@/components/shipping/ScenarioSubTabs'
import BaselineSummary from '@/components/shipping/BaselineSummary'
import CompareSection from '@/components/shipping/CompareSection'
import SaveStatusIndicator from '@/components/shipping/SaveStatusIndicator'
import { usePieceContext, createDefaultTerminal } from './context/PieceContext'
import {
  createScenario,
  updateProjectBaseline,
  updateScenario,
  listScenarios,
  loadScenario as loadScenarioRow,
  loadProject as loadProjectRow,
  syncScenariosWithBaseline,
} from '@/lib/piece-projects'
import { decomposePieceTerminals } from '@/lib/piece-reconstitute'
import { createClient } from '@/utils/supabase/client'

export default function PiecePage() {
  // ── Context (persistent across tab navigation) ──
  const {
    port, setPort,
    terminals, setTerminals,
    result, setResult,
    activeProjectId, activeProjectName,
    activeScenarioId, activeScenarioName,
    activeAssumptionProfile,
    loadProjectScenario,
    resultsClearedByAssumptions,
    currentAssumptionFingerprint,
    refreshAssumptionFingerprint,
  } = usePieceContext()

  // ── Tab state ──
  const [activeTab, setActiveTab] = useState<DashboardTab>(() =>
    activeScenarioId ? 'scenario' : 'baseline'
  )
  const [scenarioList, setScenarioList] = useState<ScenarioSummary[]>([])
  const [isBaselineEditing, setIsBaselineEditing] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [isCompareReady, setIsCompareReady] = useState(false)
  const dirtyRef = useRef(false)
  const savingRef = useRef(false)
  const skipTabSwitchRef = useRef(false)

  // ── Local transient state ──
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Refresh assumption fingerprint when returning to this page
  useEffect(() => {
    refreshAssumptionFingerprint()
  }, [refreshAssumptionFingerprint])

  // Fetch override summary for display
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
        .eq('profile_name', activeAssumptionProfile)
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
  }, [currentAssumptionFingerprint, activeAssumptionProfile])

  // ── Fetch scenario list for current project ──
  const refreshScenarioList = useCallback(async () => {
    if (!activeProjectId) { setScenarioList([]); return }
    try {
      const list = await listScenarios(activeProjectId)
      setScenarioList(list)
    } catch { /* ignore */ }
  }, [activeProjectId])

  useEffect(() => {
    refreshScenarioList()
  }, [refreshScenarioList])

  // Set initial tab when project/scenario changes (skip when switching within Results tab)
  useEffect(() => {
    if (skipTabSwitchRef.current) {
      skipTabSwitchRef.current = false
      return
    }
    if (activeScenarioId) {
      setActiveTab('scenario')
      setIsBaselineEditing(false)
    } else {
      setActiveTab('baseline')
    }
  }, [activeProjectId, activeScenarioId])

  // Mark dirty on any input change
  useEffect(() => {
    dirtyRef.current = true
  }, [port, terminals])

  // ── Terminal CRUD ──
  const addTerminal = useCallback(() => {
    setTerminals((prev) => [...prev, createDefaultTerminal()])
  }, [setTerminals])

  const removeTerminal = useCallback((id: string) => {
    setTerminals((prev) => prev.filter((t) => t.id !== id))
  }, [setTerminals])

  const updateTerminal = useCallback((id: string, updated: typeof terminals[number]) => {
    setTerminals((prev) => prev.map((t) => (t.id === id ? updated : t)))
  }, [setTerminals])

  // Grid-powered equipment (always electric)
  const GRID_POWERED_EQUIPMENT = ['mhc', 'sts', 'rmg', 'rtg', 'asc', 'reefer']

  // ── Load typical values based on port size ──
  const loadTypicalValues = useCallback(() => {
    if (!port.size_key) return

    type TerminalDef = {
      name: string
      type: TerminalType
      teu: number
      berths: { segment: string; calls: number; hours: number }[]
      equipment: Record<string, number>
      cableLength: number
    }

    type PortDef = {
      terminals: TerminalDef[]
      portServices: { tugs: number; pilotBoats: number }
    }

    const portConfigs: Record<string, PortDef> = {
      small_feeder: {
        terminals: [{
          name: 'Container Terminal', type: 'container', teu: 100000,
          berths: [
            { segment: 'container_0_3k', calls: 180, hours: 18 },
            { segment: 'container_3_6k', calls: 120, hours: 24 },
          ],
          equipment: { mhc: 2, tt: 8, rs: 2, ech: 1, reefer: 50 },
          cableLength: 400,
        }],
        portServices: { tugs: 2, pilotBoats: 1 },
      },
      regional: {
        terminals: [{
          name: 'Main Container Terminal', type: 'container', teu: 500000,
          berths: [
            { segment: 'container_3_6k', calls: 200, hours: 20 },
            { segment: 'container_3_6k', calls: 180, hours: 22 },
            { segment: 'container_6_10k', calls: 150, hours: 28 },
            { segment: 'container_6_10k', calls: 140, hours: 30 },
          ],
          equipment: { sts: 4, rtg: 12, tt: 20, ech: 4, rs: 4, reefer: 200 },
          cableLength: 800,
        }],
        portServices: { tugs: 4, pilotBoats: 2 },
      },
      hub: {
        terminals: [
          {
            name: 'Container Terminal North', type: 'container', teu: 1200000,
            berths: [
              { segment: 'container_6_10k', calls: 250, hours: 26 },
              { segment: 'container_6_10k', calls: 240, hours: 28 },
              { segment: 'container_10k_plus', calls: 180, hours: 32 },
              { segment: 'container_10k_plus', calls: 170, hours: 34 },
            ],
            equipment: { sts: 8, rmg: 16, agv: 24, ech: 4, rs: 3, sc: 8, reefer: 400 },
            cableLength: 1200,
          },
          {
            name: 'Container Terminal South', type: 'container', teu: 800000,
            berths: [
              { segment: 'container_3_6k', calls: 280, hours: 20 },
              { segment: 'container_6_10k', calls: 220, hours: 26 },
              { segment: 'container_6_10k', calls: 200, hours: 28 },
              { segment: 'container_10k_plus', calls: 150, hours: 32 },
            ],
            equipment: { sts: 6, rtg: 18, tt: 30, ech: 6, rs: 4, reefer: 350 },
            cableLength: 1000,
          },
        ],
        portServices: { tugs: 6, pilotBoats: 3 },
      },
      mega_hub: {
        terminals: [
          {
            name: 'Automated Terminal Alpha', type: 'container', teu: 2000000,
            berths: [
              { segment: 'container_10k_plus', calls: 320, hours: 30 },
              { segment: 'container_10k_plus', calls: 310, hours: 32 },
              { segment: 'container_10k_plus', calls: 300, hours: 32 },
              { segment: 'container_10k_plus', calls: 290, hours: 34 },
              { segment: 'container_10k_plus', calls: 280, hours: 34 },
            ],
            equipment: { sts: 12, asc: 30, agv: 50, ech: 6, rs: 4, reefer: 600 },
            cableLength: 1800,
          },
          {
            name: 'Automated Terminal Beta', type: 'container', teu: 1800000,
            berths: [
              { segment: 'container_6_10k', calls: 280, hours: 26 },
              { segment: 'container_10k_plus', calls: 300, hours: 30 },
              { segment: 'container_10k_plus', calls: 290, hours: 32 },
              { segment: 'container_10k_plus', calls: 280, hours: 32 },
              { segment: 'container_10k_plus', calls: 270, hours: 34 },
            ],
            equipment: { sts: 10, asc: 25, agv: 40, ech: 5, rs: 3, reefer: 500 },
            cableLength: 1600,
          },
          {
            name: 'Conventional Terminal', type: 'container', teu: 1200000,
            berths: [
              { segment: 'container_3_6k', calls: 320, hours: 18 },
              { segment: 'container_6_10k', calls: 260, hours: 24 },
              { segment: 'container_6_10k', calls: 240, hours: 26 },
              { segment: 'container_6_10k', calls: 220, hours: 28 },
              { segment: 'container_10k_plus', calls: 180, hours: 30 },
              { segment: 'container_10k_plus', calls: 160, hours: 32 },
            ],
            equipment: { sts: 10, rmg: 24, tt: 50, sc: 20, ech: 8, rs: 6, reefer: 450 },
            cableLength: 1400,
          },
        ],
        portServices: { tugs: 10, pilotBoats: 4 },
      },
    }

    const portDef = portConfigs[port.size_key]
    if (!portDef) return

    const totalTugs = portDef.portServices.tugs
    const totalPilotBoats = portDef.portServices.pilotBoats

    const newTerminals = portDef.terminals.map((termDef, termIdx) => {
      const berths: BerthDefinition[] = termDef.berths.map((berthDef, idx) => ({
        id: crypto.randomUUID(),
        berth_number: idx + 1,
        berth_name: `Berth ${idx + 1}`,
        max_vessel_segment_key: berthDef.segment,
        vessel_calls: [{
          id: crypto.randomUUID(),
          vessel_segment_key: berthDef.segment,
          annual_calls: berthDef.calls,
          avg_berth_hours: berthDef.hours,
        }],
        ops_existing: false,
        dc_existing: false,
      }))

      const berth_scenarios: BerthScenarioConfig[] = berths.map((b) => ({
        berth_id: b.id,
        ops_enabled: true,
        dc_enabled: false,
      }))

      const baseline_equipment: Record<string, BaselineEquipmentEntry> = {}
      for (const [key, qty] of Object.entries(termDef.equipment)) {
        if (GRID_POWERED_EQUIPMENT.includes(key)) {
          baseline_equipment[key] = { existing_diesel: 0, existing_electric: qty }
        } else {
          baseline_equipment[key] = { existing_diesel: qty, existing_electric: 0 }
        }
      }

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

  // ── Auto-save helpers ──

  const autoSaveBaseline = useCallback(async () => {
    if (!activeProjectId || savingRef.current) return
    savingRef.current = true
    setSaveStatus('saving')
    try {
      const { baseline } = decomposePieceTerminals(terminals)
      await updateProjectBaseline(activeProjectId, { port, baseline })

      // Sync all scenario configs with the new baseline (also invalidates results)
      if (scenarioList.length > 0) {
        await syncScenariosWithBaseline(activeProjectId, baseline, terminals)
        setResult(null)
        await refreshScenarioList()

        // Reload active scenario to get the synced config
        if (activeScenarioId) {
          const projectRow = await loadProjectRow(activeProjectId)
          const scenarioRow = await loadScenarioRow(activeScenarioId)
          loadProjectScenario(projectRow, scenarioRow)
        }
      }

      dirtyRef.current = false
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch {
      setSaveStatus('error')
    }
    savingRef.current = false
  }, [activeProjectId, terminals, port, scenarioList.length, setResult, refreshScenarioList, activeScenarioId, loadProjectScenario])

  const autoSaveScenario = useCallback(async () => {
    if (!activeScenarioId || savingRef.current) return
    savingRef.current = true
    setSaveStatus('saving')
    try {
      const { scenario: scenarioData } = decomposePieceTerminals(terminals)
      await updateScenario(activeScenarioId, { scenario_config: scenarioData })
      dirtyRef.current = false
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch {
      setSaveStatus('error')
    }
    savingRef.current = false
  }, [activeScenarioId, terminals])

  // ── Auto-create first scenario ──

  const autoCreateFirstScenario = useCallback(async () => {
    if (!activeProjectId) return
    setSaveStatus('saving')
    try {
      // Save baseline first, then create scenario preserving throughput data
      const { baseline, scenario: scenarioData } = decomposePieceTerminals(terminals)
      await updateProjectBaseline(activeProjectId, { port, baseline })

      const scenarioId = await createScenario({
        project_id: activeProjectId,
        scenario_name: 'Scenario 1',
        scenario_config: scenarioData,
      })

      // Load it into context
      const scenarioRow = await loadScenarioRow(scenarioId)
      const projectRow = await loadProjectRow(activeProjectId)
      loadProjectScenario(projectRow, scenarioRow)
      await refreshScenarioList()

      dirtyRef.current = false
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch {
      setSaveStatus('error')
    }
  }, [activeProjectId, terminals, port, loadProjectScenario, refreshScenarioList])

  // ── Tab change with auto-save ──

  const handleTabChange = useCallback(async (newTab: DashboardTab) => {
    // Auto-save before leaving current tab
    if (dirtyRef.current && activeProjectId) {
      if (activeTab === 'baseline') {
        await autoSaveBaseline()
      } else if (activeTab === 'scenario' && activeScenarioId) {
        await autoSaveScenario()
      }
    }

    // Auto-create first scenario when switching to Scenario tab
    if (newTab === 'scenario' && scenarioList.length === 0 && activeProjectId) {
      await autoCreateFirstScenario()
    }

    setActiveTab(newTab)
    if (newTab !== 'baseline') {
      setIsBaselineEditing(false)
    }
  }, [activeProjectId, activeScenarioId, activeTab, scenarioList.length, autoSaveBaseline, autoSaveScenario, autoCreateFirstScenario])

  // ── Scenario switching ──

  const handleSwitchScenario = useCallback(async (scenarioId: string) => {
    if (scenarioId === activeScenarioId) return
    // Auto-save current scenario
    if (activeScenarioId && dirtyRef.current) {
      await autoSaveScenario()
    }
    // Load new scenario
    try {
      const projectRow = await loadProjectRow(activeProjectId!)
      const scenarioRow = await loadScenarioRow(scenarioId)
      loadProjectScenario(projectRow, scenarioRow)
      dirtyRef.current = false
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to switch scenario')
    }
  }, [activeProjectId, activeScenarioId, autoSaveScenario, loadProjectScenario])

  const handleSwitchScenarioInResults = useCallback(async (scenarioId: string) => {
    if (scenarioId === activeScenarioId) return
    if (activeScenarioId && dirtyRef.current) {
      await autoSaveScenario()
    }
    try {
      const projectRow = await loadProjectRow(activeProjectId!)
      const scenarioRow = await loadScenarioRow(scenarioId)
      // Stay on Results tab — skip the useEffect that forces Scenario tab
      skipTabSwitchRef.current = true
      loadProjectScenario(projectRow, scenarioRow)
      dirtyRef.current = false
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to switch scenario')
    }
  }, [activeProjectId, activeScenarioId, autoSaveScenario, loadProjectScenario])

  const handleCreateNewScenario = useCallback(async () => {
    if (!activeProjectId) return
    // Save current scenario first
    if (activeScenarioId && dirtyRef.current) {
      await autoSaveScenario()
    }
    try {
      const nextNum = scenarioList.length + 1
      const { scenario: currentScenario } = decomposePieceTerminals(terminals)
      // New scenario: preserve throughput data, reset electrification choices
      const newScenarioConfig: ScenarioConfig = {
        terminals: currentScenario.terminals.map(st => ({
          terminal_id: st.terminal_id,
          annual_teu: st.annual_teu,
          annual_passengers: st.annual_passengers,
          annual_ceu: st.annual_ceu,
          vessel_calls_by_berth: st.vessel_calls_by_berth,
          scenario_equipment: {},
          berth_scenarios: st.berth_scenarios.map(bs => ({
            berth_id: bs.berth_id,
            ops_enabled: false,
            dc_enabled: false,
          })),
        })),
      }
      const scenarioId = await createScenario({
        project_id: activeProjectId,
        scenario_name: `Scenario ${nextNum}`,
        scenario_config: newScenarioConfig,
      })
      const scenarioRow = await loadScenarioRow(scenarioId)
      const projectRow = await loadProjectRow(activeProjectId)
      loadProjectScenario(projectRow, scenarioRow)
      await refreshScenarioList()
      dirtyRef.current = false
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create scenario')
    }
  }, [activeProjectId, activeScenarioId, scenarioList.length, terminals, autoSaveScenario, loadProjectScenario, refreshScenarioList])

  const handleRenameScenario = useCallback(async (scenarioId: string, newName: string) => {
    try {
      await updateScenario(scenarioId, { scenario_name: newName })
      await refreshScenarioList()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rename scenario')
    }
  }, [refreshScenarioList])

  // ── Calculate ──
  const handleCalculate = async () => {
    setLoading(true)
    setError(null)

    try {
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
        assumption_profile: activeAssumptionProfile,
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
        setResult(data.result, currentAssumptionFingerprint ?? undefined)

        // Auto-save result to scenario
        if (activeScenarioId) {
          const { scenario: scenarioData } = decomposePieceTerminals(terminals)
          await updateScenario(activeScenarioId, {
            scenario_config: scenarioData,
            result: data.result,
            assumption_hash: currentAssumptionFingerprint ?? undefined,
          })
          dirtyRef.current = false
          await refreshScenarioList()
        }

        // Auto-switch to Results tab
        setActiveTab('results')
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An error occurred'
      setError(message)
      setResult(null)
    }

    setLoading(false)
  }

  // ── Validation ──
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

  const isBaselineComplete = port.size_key !== '' && terminals.some(t =>
    t.annual_teu > 0 && hasBaselineEquipment(t.baseline_equipment)
  )
  const isScenarioComplete = terminals.some(t =>
    hasScenarioChanges(t.scenario_equipment) ||
    (t.berth_scenarios?.some(b => b.ops_enabled) ?? false)
  )

  // ── No project loaded → empty state ──
  if (!activeProjectId) {
    return (
      <div className="py-20">
        <div className="max-w-md mx-auto text-center">
          <div className="text-6xl text-[#bebebe] mb-6">&#128218;</div>
          <h2 className="text-xl font-semibold text-[#414141] mb-2">No project loaded</h2>
          <p className="text-sm text-[#8c8c8c] mb-6">
            Create or open a project to start configuring your port baseline and electrification scenarios.
          </p>
          <a
            href="/piece/projects"
            className="inline-block px-6 py-2.5 rounded-lg bg-[#3c5e86] text-white text-sm font-medium hover:bg-[#2a4566] transition-colors"
          >
            Go to Projects
          </a>
        </div>
      </div>
    )
  }

  // Get decomposed baseline for summary view
  const decomposed = decomposePieceTerminals(terminals)

  return (
    <>
      {/* Project/Scenario header bar */}
      <div className="bg-white border-b border-[#dcdcdc]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1.5">
                <span className="text-[#8c8c8c] text-xs font-medium">Project:</span>
                <span className="text-[#414141] font-semibold">{activeProjectName}</span>
              </div>
              {activeScenarioName && (
                <>
                  <div className="w-px h-4 bg-[#dcdcdc]" />
                  <div className="flex items-center gap-1.5">
                    <span className="text-[#8c8c8c] text-xs font-medium">Scenario:</span>
                    <span className="text-[#286464] font-semibold">{activeScenarioName}</span>
                  </div>
                </>
              )}
              <SaveStatusIndicator status={saveStatus} />
            </div>
            <div className="flex items-center gap-3">
              <a
                href={`/piece/projects/${activeProjectId}`}
                className="text-xs text-[#3c5e86] hover:text-[#2a4566] font-medium"
              >
                View Project
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <DashboardTabs
        activeTab={activeTab}
        onTabChange={handleTabChange}
        isBaselineComplete={isBaselineComplete}
        isScenarioComplete={isScenarioComplete}
        hasResult={!!result}
        isCompareReady={isCompareReady}
      />

      <div className="py-10">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">

          {/* ═══════════════════════════════════════════════════════════
              BASELINE TAB
             ═══════════════════════════════════════════════════════════ */}
          {activeTab === 'baseline' && (
            <div className="bg-[#e8f8fc] rounded-2xl p-8 border border-[#d4eefa]">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-full bg-[#3c5e86] text-white flex items-center justify-center text-sm font-bold">
                  1
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-[#414141]">Port Baseline</h2>
                  <p className="text-sm text-[#8c8c8c]">
                    {scenarioList.length > 0
                      ? 'Shared across all scenarios'
                      : 'Configure your current port setup - terminal types, throughput, and existing equipment'}
                  </p>
                </div>
              </div>

              {/* Collapsed summary when scenarios exist and not editing */}
              {scenarioList.length > 0 && !isBaselineEditing ? (
                <BaselineSummary
                  port={port}
                  baseline={decomposed.baseline}
                  terminals={terminals}
                  onEditBaseline={() => setIsBaselineEditing(true)}
                />
              ) : (
                <>
                  {/* Warning when editing with scenarios */}
                  {scenarioList.length > 0 && isBaselineEditing && (
                    <div className="mb-6 rounded-xl bg-amber-50 border border-amber-200 px-5 py-3">
                      <p className="text-sm text-amber-800 font-medium">
                        Changes to the baseline affect ALL scenarios and will invalidate existing results.
                      </p>
                      <button
                        onClick={() => setIsBaselineEditing(false)}
                        className="mt-1 text-xs text-amber-600 hover:text-amber-800 font-medium"
                      >
                        Cancel editing
                      </button>
                    </div>
                  )}

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

                  {/* Save & proceed to scenario */}
                  <div className="mt-8 flex justify-center">
                    <button
                      onClick={() => handleTabChange('scenario')}
                      disabled={!isBaselineComplete}
                      className="px-8 py-3 rounded-xl bg-[#286464] text-white text-sm font-semibold hover:bg-[#1e4e4e] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {scenarioList.length > 0 ? 'Save & Return to Scenarios' : 'Save & Create Scenario'} →
                    </button>
                    {!isBaselineComplete && (
                      <p className="ml-4 self-center text-xs text-[#8c8c8c]">
                        Configure port size and at least one terminal with throughput and equipment
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════
              SCENARIO TAB
             ═══════════════════════════════════════════════════════════ */}
          {activeTab === 'scenario' && (
            <div className="bg-[#eefae8] rounded-2xl p-8 border border-[#dcf0d6]">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-full bg-[#286464] text-white flex items-center justify-center text-sm font-bold">
                  2
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-[#414141]">Electrification Scenario</h2>
                  <p className="text-sm text-[#8c8c8c]">Configure what you want to electrify - equipment, shore power berths, chargers, and grid infrastructure</p>
                </div>
              </div>

              {/* Scenario sub-tabs */}
              <ScenarioSubTabs
                scenarios={scenarioList}
                activeScenarioId={activeScenarioId}
                onSelectScenario={handleSwitchScenario}
                onCreateScenario={handleCreateNewScenario}
                onRenameScenario={handleRenameScenario}
                disabled={loading}
              />

              {/* Terminal cards - Scenario Mode */}
              <div className="space-y-6">
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

              {/* Calculate button + info */}
              <div className="mt-8 flex flex-col items-center gap-2">
                <button
                  onClick={handleCalculate}
                  disabled={loading || !canCalculate}
                  className="text-white font-medium text-sm py-3 px-12 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-[#414141] hover:bg-[#585858]"
                >
                  {loading ? 'Calculating...' : 'Calculate PIECE Analysis'}
                </button>

                {resultsClearedByAssumptions && (
                  <p className="text-xs text-[#bc8e54] font-medium">
                    Assumptions have changed &mdash; please recalculate
                  </p>
                )}

                {overrideSummary.length > 0 && (
                  <p className="text-[10px] text-[#8c8c8c]">
                    Custom assumptions: {overrideSummary.map((s) =>
                      `${OVERRIDE_TABLE_LABELS[s.table] ?? s.table} (${s.count})`
                    ).join(', ')}
                  </p>
                )}

                {!canCalculate && (
                  <p className="text-[10px] text-[#8c8c8c]">
                    Configure at least one terminal with throughput and equipment to enable calculation
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════
              RESULTS TAB
             ═══════════════════════════════════════════════════════════ */}
          {activeTab === 'results' && (
            <div className="bg-[#fcf8e4] rounded-2xl p-8 border border-[#fceec8]">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-full bg-[#bc8e54] text-white flex items-center justify-center text-sm font-bold">
                  3
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-[#414141]">Results</h2>
                  <p className="text-sm text-[#8c8c8c]">
                    {activeScenarioName
                      ? `Results for: ${activeScenarioName}`
                      : 'Compare baseline vs electrified scenario - CAPEX, OPEX, CO2 savings, and payback period'}
                  </p>
                </div>
              </div>

              {/* Scenario sub-tabs (read-only, no + New) */}
              {scenarioList.length > 0 && (
                <ScenarioSubTabs
                  scenarios={scenarioList}
                  activeScenarioId={activeScenarioId}
                  onSelectScenario={handleSwitchScenarioInResults}
                  disabled={loading}
                />
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

              {result ? (
                <PieceResultsSection result={result} />
              ) : (
                <div className="bg-white/70 rounded-2xl p-12 border border-[#fceec8] text-center">
                  {resultsClearedByAssumptions ? (
                    <>
                      <div className="text-[#bc8e54] text-5xl mb-4">&#9888;</div>
                      <p className="text-sm text-[#414141] font-medium mb-1">
                        Assumptions have been updated
                      </p>
                      <p className="text-xs text-[#8c8c8c]">
                        Previous results were cleared. Go to the Scenario tab and click Calculate to run a new analysis.
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="text-[#bebebe] text-5xl mb-4">&#9889;</div>
                      <p className="text-sm text-[#8c8c8c]">
                        Configure your scenario and click Calculate to see PIECE analysis results.
                      </p>
                      <button
                        onClick={() => setActiveTab('scenario')}
                        className="mt-4 px-5 py-2 rounded-lg border border-[#bebebe] text-sm text-[#585858] hover:bg-white transition-colors"
                      >
                        Go to Scenario
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════
              COMPARE TAB
             ═══════════════════════════════════════════════════════════ */}
          {activeTab === 'compare' && (
            <div className="bg-[#f5f0f8] rounded-2xl p-8 border border-[#ede4f2]">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-full bg-[#7c5e8a] text-white flex items-center justify-center text-sm font-bold">
                  4
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-[#414141]">Compare Scenarios</h2>
                  <p className="text-sm text-[#8c8c8c]">
                    Select 2–3 scenarios with calculated results to compare side-by-side
                  </p>
                </div>
              </div>

              <CompareSection
                scenarioList={scenarioList}
                activeProjectId={activeProjectId!}
                onCompareReady={setIsCompareReady}
              />
            </div>
          )}

        </div>
      </div>
    </>
  )
}
