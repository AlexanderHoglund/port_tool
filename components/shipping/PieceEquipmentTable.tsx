'use client'

import { useState } from 'react'
import type { TerminalType } from '@/lib/types'

type Props = {
  terminalType: TerminalType
  baseline: Record<string, number>
  scenario: Record<string, number>
  onBaselineChange: (updated: Record<string, number>) => void
  onScenarioChange: (updated: Record<string, number>) => void
}

// PIECE equipment data grouped by category
type EquipmentMeta = {
  key: string
  name: string
  category: 'grid_powered' | 'battery_powered'
  type: 'quayside' | 'yard' | 'horizontal'
  terminalTypes: TerminalType[]
  kwhPerTeu: number
  peakKw: number
  capexUsd: number
}

const PIECE_EQUIPMENT: EquipmentMeta[] = [
  // Grid-powered equipment
  { key: 'mhc', name: 'Mobile Harbor Crane', category: 'grid_powered', type: 'quayside', terminalTypes: ['container'], kwhPerTeu: 5.5, peakKw: 750, capexUsd: 6875000 },
  { key: 'sts', name: 'Ship-to-Shore Crane', category: 'grid_powered', type: 'quayside', terminalTypes: ['container'], kwhPerTeu: 9.3, peakKw: 1100, capexUsd: 12300000 },
  { key: 'rmg', name: 'Rail Mounted Gantry', category: 'grid_powered', type: 'yard', terminalTypes: ['container'], kwhPerTeu: 2.7, peakKw: 400, capexUsd: 2520000 },
  { key: 'rtg', name: 'Rubber Tired Gantry', category: 'grid_powered', type: 'yard', terminalTypes: ['container'], kwhPerTeu: 2.8, peakKw: 300, capexUsd: 2970000 },
  { key: 'asc', name: 'Automated Stacking Crane', category: 'grid_powered', type: 'yard', terminalTypes: ['container'], kwhPerTeu: 2.5, peakKw: 330, capexUsd: 4000000 },
  { key: 'reefer', name: 'Reefer Connection', category: 'grid_powered', type: 'yard', terminalTypes: ['container'], kwhPerTeu: 3.6, peakKw: 5, capexUsd: 0 },

  // Battery-powered equipment
  { key: 'agv', name: 'Automated Guided Vehicle', category: 'battery_powered', type: 'horizontal', terminalTypes: ['container'], kwhPerTeu: 2.5, peakKw: 200, capexUsd: 750000 },
  { key: 'tt', name: 'Terminal Tractor', category: 'battery_powered', type: 'horizontal', terminalTypes: ['container', 'roro'], kwhPerTeu: 2.2, peakKw: 440, capexUsd: 165000 },
  { key: 'ech', name: 'Empty Container Handler', category: 'battery_powered', type: 'yard', terminalTypes: ['container'], kwhPerTeu: 1.8, peakKw: 220, capexUsd: 150000 },
  { key: 'rs', name: 'Reach Stacker', category: 'battery_powered', type: 'yard', terminalTypes: ['container', 'roro'], kwhPerTeu: 2.8, peakKw: 840, capexUsd: 150000 },
  { key: 'sc', name: 'Straddle Carrier', category: 'battery_powered', type: 'yard', terminalTypes: ['container'], kwhPerTeu: 3.5, peakKw: 360, capexUsd: 400000 },
]

const CATEGORIES = [
  { key: 'grid_powered', label: 'Grid-Powered Equipment', color: '#68a4c2' },
  { key: 'battery_powered', label: 'Battery-Powered Equipment', color: '#7ebb68' },
] as const

function EquipmentRow({
  meta,
  baselineQty,
  scenarioQty,
  onBaselineChange,
  onScenarioChange,
}: {
  meta: EquipmentMeta
  baselineQty: number
  scenarioQty: number
  onBaselineChange: (qty: number) => void
  onScenarioChange: (qty: number) => void
}) {
  const [expanded, setExpanded] = useState(false)

  function parseQty(raw: string): number {
    if (raw === '') return 0
    const n = parseInt(raw, 10)
    return isNaN(n) || n < 0 ? 0 : n
  }

  return (
    <>
      <tr className="border-b border-gray-100 hover:bg-gray-50/50">
        <td className="py-2 px-3 pl-8">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="text-[10px] text-[#aaa] hover:text-[#414141] w-4"
            >
              {expanded ? '\u25BC' : '\u25B6'}
            </button>
            <span className="text-[13px] text-[#414141]">{meta.name}</span>
          </div>
        </td>
        <td className="py-2 px-3 text-center text-xs text-[#8c8c8c]">{meta.kwhPerTeu}</td>
        <td className="py-2 px-3 text-center text-xs text-[#8c8c8c]">{meta.peakKw}</td>
        <td className="py-2 px-3 bg-[#f5f3f0]">
          <input
            type="number"
            min={0}
            value={baselineQty || ''}
            placeholder="0"
            onChange={(e) => onBaselineChange(parseQty(e.target.value))}
            className="w-full px-2 py-1.5 rounded border border-[#d4cfc8] text-sm text-center text-[#1a1a1a] bg-white focus:border-[#a89e92] focus:outline-none"
          />
        </td>
        <td className="py-2 px-3 bg-[#edf5fb]">
          <input
            type="number"
            min={0}
            value={scenarioQty || ''}
            placeholder="0"
            onChange={(e) => onScenarioChange(parseQty(e.target.value))}
            className="w-full px-2 py-1.5 rounded border border-[#b8daf0] text-sm text-center text-[#1a1a1a] bg-white focus:border-[#68a4c2] focus:outline-none"
          />
        </td>
      </tr>

      {expanded && (
        <tr className="border-b border-gray-100">
          <td colSpan={5} className="p-0">
            <div className="bg-[#fafafa] px-8 py-3 text-xs space-y-1">
              <div><span className="text-[#8c8c8c]">Type:</span> <span className="text-[#585858]">{meta.type}</span></div>
              <div><span className="text-[#8c8c8c]">CAPEX:</span> <span className="text-[#585858]">${(meta.capexUsd / 1000).toLocaleString()}K</span></div>
              <div><span className="text-[#8c8c8c]">Category:</span> <span className="text-[#585858]">{meta.category.replace('_', ' ')}</span></div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

function CategoryGroup({
  label,
  color,
  items,
  baseline,
  scenario,
  onBaselineChange,
  onScenarioChange,
}: {
  label: string
  color: string
  items: EquipmentMeta[]
  baseline: Record<string, number>
  scenario: Record<string, number>
  onBaselineChange: (updated: Record<string, number>) => void
  onScenarioChange: (updated: Record<string, number>) => void
}) {
  const [open, setOpen] = useState(true)
  const count = items.reduce((s, m) => s + (baseline[m.key] || 0) + (scenario[m.key] || 0), 0)

  if (items.length === 0) return null

  return (
    <>
      <tr className="cursor-pointer hover:bg-gray-50" onClick={() => setOpen(!open)}>
        <td colSpan={5} className="py-2.5 px-3 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[#8c8c8c] w-4">{open ? '\u25BC' : '\u25B6'}</span>
            <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: color }} />
            <span className="text-xs font-semibold text-[#414141]">{label}</span>
            <span className="text-[10px] text-[#aaa]">
              ({items.length} types{count > 0 ? ` \u2022 ${count} units` : ''})
            </span>
          </div>
        </td>
      </tr>

      {open && items.map((meta) => (
        <EquipmentRow
          key={meta.key}
          meta={meta}
          baselineQty={baseline[meta.key] ?? 0}
          scenarioQty={scenario[meta.key] ?? 0}
          onBaselineChange={(qty) => onBaselineChange({ ...baseline, [meta.key]: qty })}
          onScenarioChange={(qty) => onScenarioChange({ ...scenario, [meta.key]: qty })}
        />
      ))}
    </>
  )
}

export default function PieceEquipmentTable({
  terminalType,
  baseline,
  scenario,
  onBaselineChange,
  onScenarioChange,
}: Props) {
  // Filter equipment by terminal type
  const filteredEquipment = PIECE_EQUIPMENT.filter((e) =>
    e.terminalTypes.includes(terminalType)
  )

  function copyBaselineToScenario() {
    onScenarioChange({ ...baseline })
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
      <table className="w-full">
        <thead>
          <tr>
            <th className="text-left py-3 px-3 text-[10px] font-bold uppercase text-[#8c8c8c] bg-white w-[40%]">
              Equipment
            </th>
            <th className="text-center py-3 px-3 text-[10px] font-bold uppercase text-[#8c8c8c] bg-white w-[12%]">
              kWh/TEU
            </th>
            <th className="text-center py-3 px-3 text-[10px] font-bold uppercase text-[#8c8c8c] bg-white w-[12%]">
              Peak kW
            </th>
            <th className="text-center py-3 px-3 text-[10px] font-bold uppercase bg-[#e8e4de] text-[#7a7267] w-[18%]">
              Current Fleet
              <span className="block text-[9px] font-normal">(Diesel)</span>
            </th>
            <th className="text-center py-3 px-3 text-[10px] font-bold uppercase bg-[#d4eefa] text-[#3c5e86] w-[18%]">
              Electrified Fleet
              <span className="block text-[9px] font-normal">(Electric)</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {CATEGORIES.map((cat) => (
            <CategoryGroup
              key={cat.key}
              label={cat.label}
              color={cat.color}
              items={filteredEquipment.filter((e) => e.category === cat.key)}
              baseline={baseline}
              scenario={scenario}
              onBaselineChange={onBaselineChange}
              onScenarioChange={onScenarioChange}
            />
          ))}
        </tbody>
      </table>

      <div className="flex items-center justify-end px-4 py-2.5 bg-[#fafafa] border-t border-gray-100">
        <button
          type="button"
          onClick={copyBaselineToScenario}
          className="text-[11px] font-medium text-[#3c5e86] hover:text-[#2a4566]"
        >
          Copy Current Fleet → Electrified Fleet
        </button>
      </div>
    </div>
  )
}
