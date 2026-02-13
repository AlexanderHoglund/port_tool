'use client'

import { useState, useMemo } from 'react'
import type {
  PieceTerminalConfig,
  TerminalType,
  BuildingsLightingConfig,
} from '@/lib/types'
import BerthConfigPanel from './BerthConfigPanel'
import BerthScenarioPanel from './BerthScenarioPanel'
import OperationsPanel from './OperationsPanel'
import ChargerPanel from './ChargerPanel'
import GridInfraPanel from './GridInfraPanel'
import BaselineEquipmentTable from './BaselineEquipmentTable'
import ScenarioEquipmentTable from './ScenarioEquipmentTable'
import BuildingsLightingPanel from './BuildingsLightingPanel'
import CollapsibleSection from './CollapsibleSection'

type Props = {
  terminal: PieceTerminalConfig
  onChange: (updated: PieceTerminalConfig) => void
  onRemove?: () => void
  canRemove?: boolean
  defaultCollapsed?: boolean
  mode: 'baseline' | 'scenario'
}

// Terminal type options
const TERMINAL_TYPES: { value: TerminalType; label: string }[] = [
  { value: 'container', label: 'Container' },
  { value: 'cruise', label: 'Cruise' },
  { value: 'roro', label: 'RoRo' },
]

// Vessel segment labels (for berth summary)
const SEGMENT_LABELS: Record<string, string> = {
  container_0_3k: '0-3K TEU',
  container_3_6k: '3-6K TEU',
  container_6_10k: '6-10K TEU',
  container_10k_plus: '10K+ TEU',
  cruise_0_25k: '0-25K GT',
  cruise_25_100k: '25-100K GT',
  cruise_100_175k: '100-175K GT',
  cruise_175k_plus: '175K+ GT',
  roro_0_4k: '0-4K CEU',
  roro_4_7k: '4-7K CEU',
  roro_7k_plus: '7K+ CEU',
}

// Peak power by equipment type (kW) from PIECE data
const EQUIPMENT_PEAK_KW: Record<string, number> = {
  mhc: 750, sts: 1100, rmg: 400, rtg: 300, asc: 330,
  agv: 200, tt: 440, ech: 220, rs: 840, sc: 360, reefer: 5,
}

// Default buildings/lighting config
const DEFAULT_BUILDINGS_LIGHTING: BuildingsLightingConfig = {
  warehouse_sqm: 0,
  office_sqm: 0,
  workshop_sqm: 0,
  high_mast_lights: 0,
  area_lights: 0,
  roadway_lights: 0,
  annual_operating_hours: 8760,
}

export default function PieceTerminalCard({
  terminal,
  onChange,
  onRemove,
  canRemove = false,
  defaultCollapsed = false,
  mode,
}: Props) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed)

  const isBaseline = mode === 'baseline'

  // Calculate scenario equipment totals for charger panel
  const scenarioElectricEquipment = useMemo(() => {
    const result: Record<string, number> = {}
    for (const [key, baseline] of Object.entries(terminal.baseline_equipment)) {
      const scenario = terminal.scenario_equipment[key] ?? { num_to_convert: 0, num_to_add: 0 }
      const existingElectric = baseline?.existing_electric ?? 0
      const converted = Math.min(scenario.num_to_convert, baseline?.existing_diesel ?? 0)
      const added = scenario.num_to_add
      result[key] = existingElectric + converted + added
    }
    return result
  }, [terminal.baseline_equipment, terminal.scenario_equipment])

  // Calculate peak power for grid preview
  const { equipmentPeakKw, chargerPeakKw, opsPeakMw } = useMemo(() => {
    let eqPeak = 0
    for (const [key, qty] of Object.entries(scenarioElectricEquipment)) {
      eqPeak += (EQUIPMENT_PEAK_KW[key] ?? 0) * qty
    }

    // Charger peak (EVSE power)
    const evseConfig = [
      { key: 'agv', power: 200, sharing: 15 },
      { key: 'tt', power: 440, sharing: 15 },
      { key: 'ech', power: 220, sharing: 5 },
      { key: 'rs', power: 840, sharing: 9 },
      { key: 'sc', power: 360, sharing: 9 },
    ]
    let chargerPeak = 0
    for (const evse of evseConfig) {
      const qty = scenarioElectricEquipment[evse.key] ?? 0
      if (qty > 0) {
        const chargers = terminal.charger_overrides?.[`evse_${evse.key}`] ?? Math.ceil(qty / evse.sharing)
        chargerPeak += chargers * evse.power
      }
    }

    // OPS peak from enabled berths (uses max_vessel_segment_key for grid sizing)
    const opsMwBySegment: Record<string, number> = {
      container_0_3k: 2.0, container_3_6k: 5.0, container_6_10k: 6.0, container_10k_plus: 7.5,
      cruise_0_25k: 4.6, cruise_25_100k: 12.0, cruise_100_175k: 20.0, cruise_175k_plus: 26.0,
      roro_0_4k: 2.0, roro_4_7k: 4.0, roro_7k_plus: 6.5,
    }
    let opsPeak = 0
    for (const berth of terminal.berths) {
      // Include existing OPS and newly enabled OPS
      const hasExisting = berth.ops_existing
      const scenario = terminal.berth_scenarios?.find((s) => s.berth_id === berth.id)
      if (hasExisting || scenario?.ops_enabled) {
        opsPeak += opsMwBySegment[berth.max_vessel_segment_key] ?? 2.0
      }
    }

    return { equipmentPeakKw: eqPeak, chargerPeakKw: chargerPeak, opsPeakMw: opsPeak }
  }, [scenarioElectricEquipment, terminal.charger_overrides, terminal.berths, terminal.berth_scenarios])

  // Quick summary stats
  const baselineDieselCount = Object.values(terminal.baseline_equipment).reduce((s, e) => s + (e?.existing_diesel || 0), 0)
  const baselineElectricCount = Object.values(terminal.baseline_equipment).reduce((s, e) => s + (e?.existing_electric || 0), 0)
  const scenarioTotalElectric = Object.values(scenarioElectricEquipment).reduce((s, v) => s + v, 0)

  const scenarioTotalDiesel = useMemo(() => {
    let totalDiesel = 0
    for (const [key, baseline] of Object.entries(terminal.baseline_equipment)) {
      const scenario = terminal.scenario_equipment[key] ?? { num_to_convert: 0, num_to_add: 0 }
      const existingDiesel = baseline?.existing_diesel ?? 0
      const converted = Math.min(scenario.num_to_convert, existingDiesel)
      totalDiesel += existingDiesel - converted
    }
    return totalDiesel
  }, [terminal.baseline_equipment, terminal.scenario_equipment])

  const berthCount = terminal.berths.length
  const vesselCallCount = (terminal.vessel_calls ?? []).reduce((s, c) => s + c.annual_calls, 0)
  const opsExistingCount = terminal.berths.filter((b) => b.ops_existing).length
  const opsScenarioCount = terminal.berth_scenarios?.filter((b) => b.ops_enabled).length ?? 0
  const totalOpsCount = opsExistingCount + opsScenarioCount

  // Derive max vessel label from berths (largest max_vessel_segment_key across all berths)
  const maxVesselLabel = useMemo(() => {
    if (terminal.berths.length === 0) return null
    const segmentOrder = Object.keys(SEGMENT_LABELS)
    let maxIdx = -1
    for (const berth of terminal.berths) {
      const idx = segmentOrder.indexOf(berth.max_vessel_segment_key)
      if (idx > maxIdx) maxIdx = idx
    }
    if (maxIdx >= 0) return SEGMENT_LABELS[segmentOrder[maxIdx]]
    return null
  }, [terminal.berths])

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* ═══════════════════════════════════════════════════════════════
          HEADER - Terminal name, type dropdown, throughput
         ═══════════════════════════════════════════════════════════════ */}
      <div
        className="flex items-center gap-3 px-6 py-4 bg-[#f5f5f5] border-b border-gray-200 cursor-pointer"
        onClick={() => setCollapsed(!collapsed)}
      >
        <span className="text-[11px] text-[#777] w-4 shrink-0">
          {collapsed ? '\u25B6' : '\u25BC'}
        </span>

        {/* Terminal name */}
        {isBaseline ? (
          <input
            type="text"
            value={terminal.name}
            onChange={(e) => onChange({ ...terminal, name: e.target.value })}
            onClick={(e) => e.stopPropagation()}
            className="max-w-[180px] px-2 py-1 rounded border border-gray-300 font-semibold text-sm text-[#414141] bg-white focus:border-[#3c5e86] focus:outline-none"
            placeholder="Terminal name"
          />
        ) : (
          <span className="font-semibold text-sm text-[#414141]">{terminal.name}</span>
        )}

        {/* Terminal type dropdown (baseline) or badge (scenario) */}
        {isBaseline ? (
          <select
            value={terminal.terminal_type}
            onChange={(e) => {
              e.stopPropagation()
              onChange({ ...terminal, terminal_type: e.target.value as TerminalType })
            }}
            onClick={(e) => e.stopPropagation()}
            className="px-2 py-1 rounded border border-gray-300 text-xs font-semibold text-[#3c5e86] bg-white focus:border-[#3c5e86] focus:outline-none cursor-pointer"
          >
            {TERMINAL_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        ) : (
          <span className="text-[10px] text-white bg-[#3c5e86] px-2 py-0.5 rounded uppercase font-semibold">
            {terminal.terminal_type}
          </span>
        )}

        {/* Mode badge */}
        <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
          isBaseline
            ? 'bg-amber-100 text-amber-800'
            : 'bg-green-100 text-green-800'
        }`}>
          {isBaseline ? 'BASELINE' : 'SCENARIO'}
        </span>

        {/* Collapsed summary */}
        {collapsed && (
          <div className="flex items-center gap-4 text-[11px] text-[#777]">
            {isBaseline && (baselineDieselCount > 0 || baselineElectricCount > 0) && (
              <span>
                <span className="text-[#7a5c10] font-medium">{baselineDieselCount} diesel</span>
                {' + '}
                <span className="text-[#2d5480] font-medium">{baselineElectricCount} electric</span>
              </span>
            )}
            {!isBaseline && (scenarioTotalDiesel > 0 || scenarioTotalElectric > 0) && (
              <span>
                {scenarioTotalDiesel > 0 && <span className="text-[#7a5c10] font-medium">{scenarioTotalDiesel} diesel</span>}
                {scenarioTotalDiesel > 0 && scenarioTotalElectric > 0 && ' + '}
                {scenarioTotalElectric > 0 && <span className="text-[#2d5480] font-medium">{scenarioTotalElectric} electric</span>}
              </span>
            )}
            {berthCount > 0 && (
              <span>{berthCount} berths{!isBaseline && totalOpsCount > 0 ? ` (${totalOpsCount} OPS)` : ''}</span>
            )}
            {vesselCallCount > 0 && (
              <span>{vesselCallCount.toLocaleString()} calls/yr</span>
            )}
            {maxVesselLabel && (
              <span>Max: {maxVesselLabel}</span>
            )}
          </div>
        )}

        <div className="flex-1" />

        {canRemove && isBaseline && onRemove && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onRemove()
            }}
            className="text-xs text-[#9e5858] hover:text-red-700 font-medium"
          >
            Remove
          </button>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          CONTENT - Vertical collapsible sections
         ═══════════════════════════════════════════════════════════════ */}
      {!collapsed && (
        <>
          {/* ────────────────────────────────────────────────────────
              BASELINE MODE
             ──────────────────────────────────────────────────────── */}
          {isBaseline && (
            <>
              {/* Berths */}
              <CollapsibleSection
                title="Berths"
                badge={berthCount > 0
                  ? `${berthCount} berth${berthCount !== 1 ? 's' : ''}${maxVesselLabel ? ` · Max: ${maxVesselLabel}` : ''}`
                  : undefined}
                defaultOpen={false}
              >
                <BerthConfigPanel
                  berths={terminal.berths}
                  terminalType={terminal.terminal_type}
                  onChange={(berths) => onChange({ ...terminal, berths })}
                />
              </CollapsibleSection>

              {/* Onshore Equipment */}
              <CollapsibleSection
                title="Onshore Equipment"
                badge={
                  (baselineDieselCount > 0 || baselineElectricCount > 0)
                    ? `${baselineDieselCount} diesel + ${baselineElectricCount} electric`
                    : undefined
                }
                defaultOpen={false}
              >
                <BaselineEquipmentTable
                  terminalType={terminal.terminal_type}
                  equipment={terminal.baseline_equipment}
                  onChange={(eq) => onChange({ ...terminal, baseline_equipment: eq })}
                />
              </CollapsibleSection>

              {/* Buildings & Lighting */}
              <CollapsibleSection
                title="Buildings & Lighting"
                defaultOpen={false}
              >
                <BuildingsLightingPanel
                  config={terminal.buildings_lighting ?? DEFAULT_BUILDINGS_LIGHTING}
                  onChange={(config) => onChange({ ...terminal, buildings_lighting: config })}
                />
              </CollapsibleSection>

              {/* Operations (throughput + vessel calls) */}
              <CollapsibleSection
                title="Operations"
                badge={vesselCallCount > 0
                  ? `${vesselCallCount.toLocaleString()} calls/yr`
                  : undefined}
                defaultOpen={false}
              >
                <OperationsPanel
                  terminalType={terminal.terminal_type}
                  annualTeu={terminal.annual_teu}
                  annualPassengers={terminal.annual_passengers}
                  annualCeu={terminal.annual_ceu}
                  vesselCalls={terminal.vessel_calls ?? []}
                  onTeuChange={(v) => onChange({ ...terminal, annual_teu: v })}
                  onPassengersChange={(v) => onChange({ ...terminal, annual_passengers: v })}
                  onCeuChange={(v) => onChange({ ...terminal, annual_ceu: v })}
                  onVesselCallsChange={(calls) => onChange({ ...terminal, vessel_calls: calls })}
                />
              </CollapsibleSection>
            </>
          )}

          {/* ────────────────────────────────────────────────────────
              SCENARIO MODE
             ──────────────────────────────────────────────────────── */}
          {!isBaseline && (
            <>
              {/* Shore Power (OPS/DC) */}
              <CollapsibleSection
                title="Shore Power (OPS/DC)"
                badge={totalOpsCount > 0 ? `${totalOpsCount}/${berthCount} berths with OPS` : undefined}
                defaultOpen={false}
              >
                <BerthScenarioPanel
                  berths={terminal.berths}
                  scenarios={terminal.berth_scenarios ?? []}
                  terminalType={terminal.terminal_type}
                  onChange={(scenarios) => onChange({ ...terminal, berth_scenarios: scenarios })}
                />
              </CollapsibleSection>

              {/* Onshore Equipment Changes */}
              <CollapsibleSection
                title="Onshore Equipment Changes"
                defaultOpen={false}
              >
                <ScenarioEquipmentTable
                  terminalType={terminal.terminal_type}
                  baseline={terminal.baseline_equipment}
                  scenario={terminal.scenario_equipment}
                  onChange={(eq) => onChange({ ...terminal, scenario_equipment: eq })}
                />
              </CollapsibleSection>

              {/* Chargers */}
              <CollapsibleSection
                title="Chargers (EVSE)"
                defaultOpen={false}
              >
                <ChargerPanel
                  scenarioEquipment={scenarioElectricEquipment}
                  chargerOverrides={terminal.charger_overrides}
                  onChange={(overrides) =>
                    onChange({ ...terminal, charger_overrides: overrides })
                  }
                />
              </CollapsibleSection>

              {/* Grid Infrastructure */}
              <CollapsibleSection
                title="Grid Infrastructure"
                defaultOpen={false}
              >
                <GridInfraPanel
                  cableLengthM={terminal.cable_length_m ?? 500}
                  onCableLengthChange={(len) => onChange({ ...terminal, cable_length_m: len })}
                  equipmentPeakKw={equipmentPeakKw}
                  chargerPeakKw={chargerPeakKw}
                  opsPeakMw={opsPeakMw}
                />
              </CollapsibleSection>

            </>
          )}
        </>
      )}
    </div>
  )
}
