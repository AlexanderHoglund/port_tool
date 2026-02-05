'use client'

import { useState, useMemo } from 'react'
import type { PieceTerminalConfig, TerminalType } from '@/lib/types'
import TerminalTypeSelector from './TerminalTypeSelector'
import BerthConfigPanel from './BerthConfigPanel'
import ChargerPanel from './ChargerPanel'
import GridInfraPanel from './GridInfraPanel'
import PieceEquipmentTable from './PieceEquipmentTable'

type Props = {
  terminal: PieceTerminalConfig
  onChange: (updated: PieceTerminalConfig) => void
  onRemove: () => void
  canRemove: boolean
  defaultCollapsed?: boolean
}

type TabKey = 'equipment' | 'berths' | 'chargers' | 'grid'

// Peak power by equipment type (kW) from PIECE data
const EQUIPMENT_PEAK_KW: Record<string, number> = {
  mhc: 750, sts: 1100, rmg: 400, rtg: 300, asc: 330,
  agv: 200, tt: 440, ech: 220, rs: 840, sc: 360, reefer: 5,
}

export default function PieceTerminalCard({
  terminal,
  onChange,
  onRemove,
  canRemove,
  defaultCollapsed = false,
}: Props) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed)
  const [activeTab, setActiveTab] = useState<TabKey>('equipment')

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'equipment', label: 'Equipment & Throughput' },
    { key: 'berths', label: 'Berths & Shore Power' },
    { key: 'chargers', label: 'Chargers (EVSE)' },
    { key: 'grid', label: 'Grid Infrastructure' },
  ]

  // Calculate peak power for grid preview
  const { equipmentPeakKw, chargerPeakKw, opsPeakMw } = useMemo(() => {
    let eqPeak = 0
    for (const [key, qty] of Object.entries(terminal.scenario_equipment)) {
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
      const qty = terminal.scenario_equipment[evse.key] ?? 0
      if (qty > 0) {
        const chargers = terminal.charger_overrides?.[`evse_${evse.key}`] ?? Math.ceil(qty / evse.sharing)
        chargerPeak += chargers * evse.power
      }
    }

    // OPS peak from enabled berths
    const opsMwBySegment: Record<string, number> = {
      container_0_3k: 2.0, container_3_6k: 5.0, container_6_10k: 6.0, container_10k_plus: 7.5,
      cruise_0_25k: 4.6, cruise_25_100k: 12.0, cruise_100_175k: 20.0, cruise_175k_plus: 26.0,
      roro_0_4k: 2.0, roro_4_7k: 4.0, roro_7k_plus: 6.5,
      tug_70bp: 0.3, pilot_boat: 0.1,
    }
    let opsPeak = 0
    for (const berth of terminal.berths) {
      if (berth.ops_enabled) {
        opsPeak += opsMwBySegment[berth.vessel_segment_key] ?? 2.0
      }
    }

    return { equipmentPeakKw: eqPeak, chargerPeakKw: chargerPeak, opsPeakMw: opsPeak }
  }, [terminal.scenario_equipment, terminal.charger_overrides, terminal.berths])

  // Quick summary stats
  const baselineCount = Object.values(terminal.baseline_equipment).reduce((s, v) => s + v, 0)
  const scenarioCount = Object.values(terminal.scenario_equipment).reduce((s, v) => s + v, 0)
  const berthCount = terminal.berths.length
  const opsCount = terminal.berths.filter((b) => b.ops_enabled).length

  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center gap-3 px-6 py-4 bg-[#fafafa] border-b border-gray-100 cursor-pointer"
        onClick={() => setCollapsed(!collapsed)}
      >
        <span className="text-[11px] text-[#8c8c8c] w-4 shrink-0">
          {collapsed ? '\u25B6' : '\u25BC'}
        </span>

        <input
          type="text"
          value={terminal.name}
          onChange={(e) => onChange({ ...terminal, name: e.target.value })}
          onClick={(e) => e.stopPropagation()}
          className="max-w-xs px-2 py-1 rounded border border-gray-200 font-semibold text-sm text-[#1a1a1a] bg-white focus:border-[#3c5e86] focus:outline-none"
          placeholder="Terminal name"
        />

        <span className="text-[10px] text-white bg-[#3c5e86] px-2 py-0.5 rounded uppercase font-semibold">
          {terminal.terminal_type}
        </span>

        {collapsed && (
          <div className="flex items-center gap-4 text-[10px] text-[#8c8c8c]">
            {terminal.annual_teu > 0 && (
              <span>{(terminal.annual_teu / 1000000).toFixed(1)}M TEU</span>
            )}
            {baselineCount > 0 && <span>{baselineCount} baseline</span>}
            {scenarioCount > 0 && <span>{scenarioCount} electric</span>}
            {berthCount > 0 && <span>{berthCount} berths ({opsCount} OPS)</span>}
          </div>
        )}

        <div className="flex-1" />

        {canRemove && (
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

      {/* Content */}
      {!collapsed && (
        <>
          {/* Terminal Type Selector */}
          <div className="p-6 border-b border-gray-100">
            <TerminalTypeSelector
              value={terminal.terminal_type}
              onChange={(type: TerminalType) => onChange({ ...terminal, terminal_type: type })}
            />
          </div>

          {/* Tab bar */}
          <div className="flex border-b border-gray-100">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 text-center py-3 text-xs font-semibold uppercase tracking-wide transition-colors
                  ${
                    activeTab === tab.key
                      ? 'text-[#3c5e86] border-b-2 border-[#3c5e86] bg-white'
                      : 'text-[#8c8c8c] hover:text-[#585858] bg-[#fafafa]'
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="p-6">
            {activeTab === 'equipment' && (
              <div className="space-y-6">
                {/* Throughput */}
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold uppercase tracking-wide text-[#8c8c8c]">
                    Annual Throughput (TEU)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={10000}
                    value={terminal.annual_teu || ''}
                    onChange={(e) =>
                      onChange({ ...terminal, annual_teu: parseInt(e.target.value) || 0 })
                    }
                    placeholder="e.g., 500000"
                    className="w-48 px-3 py-2 rounded-lg border border-gray-200 text-sm text-[#1a1a1a] bg-white focus:border-[#3c5e86] focus:ring-1 focus:ring-[#3c5e86] focus:outline-none"
                  />
                  <p className="text-[10px] text-[#8c8c8c]">
                    Used for throughput-based energy calculations (kWh/TEU × TEU)
                  </p>
                </div>

                {/* Equipment Table */}
                <PieceEquipmentTable
                  terminalType={terminal.terminal_type}
                  baseline={terminal.baseline_equipment}
                  scenario={terminal.scenario_equipment}
                  onBaselineChange={(eq) => onChange({ ...terminal, baseline_equipment: eq })}
                  onScenarioChange={(eq) => onChange({ ...terminal, scenario_equipment: eq })}
                />
              </div>
            )}

            {activeTab === 'berths' && (
              <BerthConfigPanel
                berths={terminal.berths}
                terminalType={terminal.terminal_type}
                onChange={(berths) => onChange({ ...terminal, berths })}
              />
            )}

            {activeTab === 'chargers' && (
              <ChargerPanel
                scenarioEquipment={terminal.scenario_equipment}
                chargerOverrides={terminal.charger_overrides}
                onChange={(overrides) =>
                  onChange({ ...terminal, charger_overrides: overrides })
                }
              />
            )}

            {activeTab === 'grid' && (
              <GridInfraPanel
                cableLengthM={terminal.cable_length_m ?? 500}
                onCableLengthChange={(len) => onChange({ ...terminal, cable_length_m: len })}
                equipmentPeakKw={equipmentPeakKw}
                chargerPeakKw={chargerPeakKw}
                opsPeakMw={opsPeakMw}
              />
            )}
          </div>
        </>
      )}
    </div>
  )
}
