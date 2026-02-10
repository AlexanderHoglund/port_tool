'use client'

import { useState } from 'react'
import type { TerminalType, BaselineEquipmentEntry } from '@/lib/types'

type Props = {
  terminalType: TerminalType
  equipment: Record<string, BaselineEquipmentEntry>
  onChange: (updated: Record<string, BaselineEquipmentEntry>) => void
}

// PIECE equipment data grouped by category
type EquipmentMeta = {
  key: string
  name: string
  category: 'grid_powered' | 'mobile'
  type: 'quayside' | 'yard' | 'horizontal'
  terminalTypes: TerminalType[]
  kwhPerTeu: number
  peakKw: number
  capexUsd: number
}

const PIECE_EQUIPMENT: EquipmentMeta[] = [
  // Grid-powered equipment (always electric, no diesel option)
  { key: 'mhc', name: 'Mobile Harbor Crane', category: 'grid_powered', type: 'quayside', terminalTypes: ['container'], kwhPerTeu: 5.5, peakKw: 750, capexUsd: 6875000 },
  { key: 'sts', name: 'Ship-to-Shore Crane', category: 'grid_powered', type: 'quayside', terminalTypes: ['container'], kwhPerTeu: 9.3, peakKw: 1100, capexUsd: 12300000 },
  { key: 'rmg', name: 'Rail Mounted Gantry', category: 'grid_powered', type: 'yard', terminalTypes: ['container'], kwhPerTeu: 2.7, peakKw: 400, capexUsd: 2520000 },
  { key: 'rtg', name: 'Rubber Tired Gantry', category: 'grid_powered', type: 'yard', terminalTypes: ['container'], kwhPerTeu: 2.8, peakKw: 300, capexUsd: 2970000 },
  { key: 'asc', name: 'Automated Stacking Crane', category: 'grid_powered', type: 'yard', terminalTypes: ['container'], kwhPerTeu: 2.5, peakKw: 330, capexUsd: 4000000 },
  { key: 'reefer', name: 'Reefer Connection', category: 'grid_powered', type: 'yard', terminalTypes: ['container'], kwhPerTeu: 3.6, peakKw: 5, capexUsd: 0 },

  // Mobile equipment (can be diesel or electric)
  { key: 'agv', name: 'Automated Guided Vehicle', category: 'mobile', type: 'horizontal', terminalTypes: ['container'], kwhPerTeu: 2.5, peakKw: 200, capexUsd: 750000 },
  { key: 'tt', name: 'Terminal Tractor', category: 'mobile', type: 'horizontal', terminalTypes: ['container', 'roro'], kwhPerTeu: 2.2, peakKw: 440, capexUsd: 165000 },
  { key: 'ech', name: 'Empty Container Handler', category: 'mobile', type: 'yard', terminalTypes: ['container'], kwhPerTeu: 1.8, peakKw: 220, capexUsd: 150000 },
  { key: 'rs', name: 'Reach Stacker', category: 'mobile', type: 'yard', terminalTypes: ['container', 'roro'], kwhPerTeu: 2.8, peakKw: 840, capexUsd: 150000 },
  { key: 'sc', name: 'Straddle Carrier', category: 'mobile', type: 'yard', terminalTypes: ['container'], kwhPerTeu: 3.5, peakKw: 360, capexUsd: 400000 },
]

const CATEGORIES = [
  { key: 'grid_powered', label: 'Grid-Powered Equipment', sublabel: '(always electric)', color: '#4a90b8' },
  { key: 'mobile', label: 'Mobile Equipment', sublabel: '(diesel or electric)', color: '#5ea648' },
] as const

function parseQty(raw: string): number {
  if (raw === '') return 0
  const n = parseInt(raw, 10)
  return isNaN(n) || n < 0 ? 0 : n
}

function EquipmentRow({
  meta,
  entry,
  onChange,
}: {
  meta: EquipmentMeta
  entry: BaselineEquipmentEntry
  onChange: (updated: BaselineEquipmentEntry) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const isGridPowered = meta.category === 'grid_powered'

  return (
    <>
      <tr className="border-b border-gray-100 hover:bg-gray-50/50">
        <td className="py-2 px-3 pl-8">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="text-[10px] text-[#999] hover:text-[#333] w-4"
            >
              {expanded ? '\u25BC' : '\u25B6'}
            </button>
            <span className="text-[13px] text-[#333]">{meta.name}</span>
          </div>
        </td>
        <td className="py-2 px-3 text-center text-xs text-[#777]">{meta.kwhPerTeu}</td>
        <td className="py-2 px-3 text-center text-xs text-[#777]">{meta.peakKw}</td>

        {/* Diesel column */}
        <td className="py-2 px-3 bg-[#fef3e8]">
          {isGridPowered ? (
            <div className="text-center text-xs text-[#bbb]">—</div>
          ) : (
            <input
              type="number"
              min={0}
              value={entry.existing_diesel || ''}
              placeholder="0"
              onChange={(e) => onChange({ ...entry, existing_diesel: parseQty(e.target.value) })}
              className="w-full px-2 py-1.5 rounded border border-[#e0c9ad] text-sm text-center text-[#414141] bg-white focus:border-[#c9a87c] focus:outline-none"
            />
          )}
        </td>

        {/* Electric column */}
        <td className="py-2 px-3 bg-[#eaf3fb]">
          <input
            type="number"
            min={0}
            value={entry.existing_electric || ''}
            placeholder="0"
            onChange={(e) => onChange({ ...entry, existing_electric: parseQty(e.target.value) })}
            className="w-full px-2 py-1.5 rounded border border-[#a8cde8] text-sm text-center text-[#414141] bg-white focus:border-[#5a95c0] focus:outline-none"
          />
        </td>

        {/* Total column */}
        <td className="py-2 px-3 text-center text-sm font-semibold text-[#333]">
          {entry.existing_diesel + entry.existing_electric}
        </td>
      </tr>

      {expanded && (
        <tr className="border-b border-gray-100">
          <td colSpan={6} className="p-0">
            <div className="bg-[#f5f5f5] px-8 py-3 text-xs space-y-1">
              <div><span className="text-[#777]">Type:</span> <span className="text-[#444]">{meta.type}</span></div>
              <div><span className="text-[#777]">CAPEX:</span> <span className="text-[#444]">${(meta.capexUsd / 1000).toLocaleString()}K</span></div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

function CategoryGroup({
  label,
  sublabel,
  color,
  items,
  equipment,
  onChange,
}: {
  label: string
  sublabel: string
  color: string
  items: EquipmentMeta[]
  equipment: Record<string, BaselineEquipmentEntry>
  onChange: (updated: Record<string, BaselineEquipmentEntry>) => void
}) {
  const [open, setOpen] = useState(false)

  // Calculate totals for this category
  const dieselCount = items.reduce((s, m) => s + (equipment[m.key]?.existing_diesel || 0), 0)
  const electricCount = items.reduce((s, m) => s + (equipment[m.key]?.existing_electric || 0), 0)
  const totalCount = dieselCount + electricCount

  if (items.length === 0) return null

  return (
    <>
      <tr className="cursor-pointer hover:bg-gray-50" onClick={() => setOpen(!open)}>
        <td colSpan={6} className="py-2.5 px-3 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[#777] w-4">{open ? '\u25BC' : '\u25B6'}</span>
            <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: color }} />
            <span className="text-xs font-bold text-[#333]">{label}</span>
            <span className="text-[11px] text-[#888]">{sublabel}</span>
            <span className="text-[11px] text-[#888]">
              ({items.length} types{totalCount > 0 ? ` \u2022 ${totalCount} units` : ''})
            </span>
          </div>
        </td>
      </tr>

      {open && items.map((meta) => {
        const entry = equipment[meta.key] ?? { existing_diesel: 0, existing_electric: 0 }
        return (
          <EquipmentRow
            key={meta.key}
            meta={meta}
            entry={entry}
            onChange={(updated) => onChange({ ...equipment, [meta.key]: updated })}
          />
        )
      })}
    </>
  )
}

export default function BaselineEquipmentTable({
  terminalType,
  equipment,
  onChange,
}: Props) {
  // Filter equipment by terminal type
  const filteredEquipment = PIECE_EQUIPMENT.filter((e) =>
    e.terminalTypes.includes(terminalType)
  )

  // Calculate overall totals
  const totalDiesel = Object.values(equipment).reduce((s, e) => s + (e?.existing_diesel || 0), 0)
  const totalElectric = Object.values(equipment).reduce((s, e) => s + (e?.existing_electric || 0), 0)

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
      <table className="w-full">
        <thead>
          <tr>
            <th className="text-left py-3 px-3 text-[11px] font-bold uppercase text-[#666] bg-white w-[35%]">
              Equipment
            </th>
            <th className="text-center py-3 px-3 text-[11px] font-bold uppercase text-[#666] bg-white w-[10%]">
              kWh/TEU
            </th>
            <th className="text-center py-3 px-3 text-[11px] font-bold uppercase text-[#666] bg-white w-[10%]">
              Peak kW
            </th>
            <th className="text-center py-3 px-3 text-[11px] font-bold uppercase bg-[#fde8d8] text-[#7a5c10] w-[15%]">
              Diesel
              <span className="block text-[9px] font-normal text-[#996e1a]">(existing)</span>
            </th>
            <th className="text-center py-3 px-3 text-[11px] font-bold uppercase bg-[#d4eefa] text-[#2d5480] w-[15%]">
              Electric
              <span className="block text-[9px] font-normal text-[#3c6d9e]">(existing)</span>
            </th>
            <th className="text-center py-3 px-3 text-[11px] font-bold uppercase bg-[#eee] text-[#444] w-[15%]">
              Total
            </th>
          </tr>
        </thead>
        <tbody>
          {CATEGORIES.map((cat) => (
            <CategoryGroup
              key={cat.key}
              label={cat.label}
              sublabel={cat.sublabel}
              color={cat.color}
              items={filteredEquipment.filter((e) => e.category === cat.key)}
              equipment={equipment}
              onChange={onChange}
            />
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-gray-300 bg-[#f5f5f5]">
            <td colSpan={3} className="py-3 px-3 text-right text-xs font-bold text-[#444]">
              Fleet Totals:
            </td>
            <td className="py-3 px-3 text-center text-sm font-bold text-[#7a5c10] bg-[#fef3e8]">
              {totalDiesel}
            </td>
            <td className="py-3 px-3 text-center text-sm font-bold text-[#2d5480] bg-[#eaf3fb]">
              {totalElectric}
            </td>
            <td className="py-3 px-3 text-center text-sm font-bold text-[#333]">
              {totalDiesel + totalElectric}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
