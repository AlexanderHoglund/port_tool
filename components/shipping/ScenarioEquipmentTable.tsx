'use client'

import { useState } from 'react'
import type { TerminalType, BaselineEquipmentEntry, ScenarioEquipmentEntry } from '@/lib/types'

type Props = {
  terminalType: TerminalType
  baseline: Record<string, BaselineEquipmentEntry>
  scenario: Record<string, ScenarioEquipmentEntry>
  onChange: (updated: Record<string, ScenarioEquipmentEntry>) => void
}

// PIECE equipment data
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
  // Grid-powered equipment (always electric)
  { key: 'mhc', name: 'Mobile Harbor Crane', category: 'grid_powered', type: 'quayside', terminalTypes: ['container'], kwhPerTeu: 5.5, peakKw: 750, capexUsd: 6875000 },
  { key: 'sts', name: 'Ship-to-Shore Crane', category: 'grid_powered', type: 'quayside', terminalTypes: ['container'], kwhPerTeu: 9.3, peakKw: 1100, capexUsd: 12300000 },
  { key: 'rmg', name: 'Rail Mounted Gantry', category: 'grid_powered', type: 'yard', terminalTypes: ['container'], kwhPerTeu: 2.7, peakKw: 400, capexUsd: 2520000 },
  { key: 'rtg', name: 'Rubber Tired Gantry', category: 'grid_powered', type: 'yard', terminalTypes: ['container'], kwhPerTeu: 2.8, peakKw: 300, capexUsd: 2970000 },
  { key: 'asc', name: 'Automated Stacking Crane', category: 'grid_powered', type: 'yard', terminalTypes: ['container'], kwhPerTeu: 2.5, peakKw: 330, capexUsd: 4000000 },
  { key: 'reefer', name: 'Reefer Connection', category: 'grid_powered', type: 'yard', terminalTypes: ['container'], kwhPerTeu: 3.6, peakKw: 5, capexUsd: 0 },

  // Mobile equipment (diesel or electric)
  { key: 'agv', name: 'Automated Guided Vehicle', category: 'mobile', type: 'horizontal', terminalTypes: ['container'], kwhPerTeu: 2.5, peakKw: 200, capexUsd: 750000 },
  { key: 'tt', name: 'Terminal Tractor', category: 'mobile', type: 'horizontal', terminalTypes: ['container', 'roro'], kwhPerTeu: 2.2, peakKw: 440, capexUsd: 165000 },
  { key: 'ech', name: 'Empty Container Handler', category: 'mobile', type: 'yard', terminalTypes: ['container'], kwhPerTeu: 1.8, peakKw: 220, capexUsd: 150000 },
  { key: 'rs', name: 'Reach Stacker', category: 'mobile', type: 'yard', terminalTypes: ['container', 'roro'], kwhPerTeu: 2.8, peakKw: 840, capexUsd: 150000 },
  { key: 'sc', name: 'Straddle Carrier', category: 'mobile', type: 'yard', terminalTypes: ['container'], kwhPerTeu: 3.5, peakKw: 360, capexUsd: 400000 },
]

const CATEGORIES = [
  { key: 'grid_powered', label: 'Grid-Powered Equipment', sublabel: '(add new only)', color: '#4a90b8' },
  { key: 'mobile', label: 'Mobile Equipment', sublabel: '(convert or add)', color: '#5ea648' },
] as const

function parseQty(raw: string): number {
  if (raw === '') return 0
  const n = parseInt(raw, 10)
  return isNaN(n) || n < 0 ? 0 : n
}

function EquipmentRow({
  meta,
  baselineEntry,
  scenarioEntry,
  onChange,
}: {
  meta: EquipmentMeta
  baselineEntry: BaselineEquipmentEntry
  scenarioEntry: ScenarioEquipmentEntry
  onChange: (updated: ScenarioEquipmentEntry) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const isGridPowered = meta.category === 'grid_powered'

  // Calculate baseline totals
  const baselineDiesel = baselineEntry.existing_diesel
  const baselineElectric = baselineEntry.existing_electric

  // Calculate scenario totals
  const toConvert = Math.min(scenarioEntry.num_to_convert, baselineDiesel)
  const toAdd = scenarioEntry.num_to_add
  const scenarioElectric = baselineElectric + toConvert + toAdd
  const scenarioDiesel = baselineDiesel - toConvert

  // Validation: can't convert more than existing diesel
  const maxConvert = baselineDiesel
  const convertWarning = scenarioEntry.num_to_convert > maxConvert

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

        {/* Baseline diesel */}
        <td className="py-2 px-3 text-center text-xs bg-[#f8f8f8]">
          {isGridPowered ? (
            <span className="text-[#bbb]">—</span>
          ) : (
            <span className="text-[#7a5c10] font-medium">{baselineDiesel}</span>
          )}
        </td>

        {/* Baseline electric */}
        <td className="py-2 px-3 text-center text-xs bg-[#f8f8f8]">
          <span className="text-[#2d5480] font-medium">{baselineElectric}</span>
        </td>

        {/* Convert column */}
        <td className="py-2 px-3 bg-[#fff8e8]">
          {isGridPowered ? (
            <div className="text-center text-xs text-[#bbb]">—</div>
          ) : (
            <div className="relative">
              <input
                type="number"
                min={0}
                max={maxConvert}
                value={scenarioEntry.num_to_convert || ''}
                placeholder="0"
                onChange={(e) => onChange({ ...scenarioEntry, num_to_convert: parseQty(e.target.value) })}
                className={`w-full px-2 py-1.5 rounded border text-sm text-center text-[#414141] bg-white focus:outline-none ${
                  convertWarning
                    ? 'border-red-400 focus:border-red-500'
                    : 'border-[#e0c9ad] focus:border-[#c9a87c]'
                }`}
              />
              {maxConvert > 0 && (
                <div className="text-[9px] text-[#999] text-center mt-0.5">
                  max {maxConvert}
                </div>
              )}
            </div>
          )}
        </td>

        {/* Add New column */}
        <td className="py-2 px-3 bg-[#e8f5e9]">
          <input
            type="number"
            min={0}
            value={scenarioEntry.num_to_add || ''}
            placeholder="0"
            onChange={(e) => onChange({ ...scenarioEntry, num_to_add: parseQty(e.target.value) })}
            className="w-full px-2 py-1.5 rounded border border-[#b4d9b6] text-sm text-center text-[#414141] bg-white focus:border-[#4caf50] focus:outline-none"
          />
        </td>

        {/* Resulting fleet - diesel */}
        <td className="py-2 px-3 text-center text-xs bg-[#f0f0f0]">
          {isGridPowered ? (
            <span className="text-[#bbb]">—</span>
          ) : scenarioDiesel > 0 ? (
            <span className="text-[#7a5c10] font-semibold">{scenarioDiesel}</span>
          ) : (
            <span className="text-[#bbb]">0</span>
          )}
        </td>

        {/* Resulting fleet - electric */}
        <td className="py-2 px-3 text-center text-xs bg-[#f0f0f0]">
          {scenarioElectric > 0 ? (
            <span className="text-[#2d5480] font-semibold">{scenarioElectric}</span>
          ) : (
            <span className="text-[#bbb]">0</span>
          )}
        </td>
      </tr>

      {expanded && (
        <tr className="border-b border-gray-100">
          <td colSpan={7} className="p-0">
            <div className="bg-[#f5f5f5] px-8 py-3 text-xs space-y-1">
              <div><span className="text-[#777]">Type:</span> <span className="text-[#444]">{meta.type}</span></div>
              <div><span className="text-[#777]">CAPEX (new electric):</span> <span className="text-[#444]">${(meta.capexUsd / 1000).toLocaleString()}K</span></div>
              <div><span className="text-[#777]">kWh/TEU:</span> <span className="text-[#444]">{meta.kwhPerTeu}</span></div>
              <div><span className="text-[#777]">Peak kW:</span> <span className="text-[#444]">{meta.peakKw}</span></div>
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
  baseline,
  scenario,
  onChange,
}: {
  label: string
  sublabel: string
  color: string
  items: EquipmentMeta[]
  baseline: Record<string, BaselineEquipmentEntry>
  scenario: Record<string, ScenarioEquipmentEntry>
  onChange: (updated: Record<string, ScenarioEquipmentEntry>) => void
}) {
  const [open, setOpen] = useState(false)

  // Calculate category totals
  let totalConvert = 0
  let totalAdd = 0

  for (const item of items) {
    const base = baseline[item.key] ?? { existing_diesel: 0, existing_electric: 0 }
    const scen = scenario[item.key] ?? { num_to_convert: 0, num_to_add: 0 }
    totalConvert += Math.min(scen.num_to_convert, base.existing_diesel)
    totalAdd += scen.num_to_add
  }

  if (items.length === 0) return null

  return (
    <>
      <tr className="cursor-pointer hover:bg-gray-50" onClick={() => setOpen(!open)}>
        <td colSpan={7} className="py-2.5 px-3 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[#777] w-4">{open ? '\u25BC' : '\u25B6'}</span>
            <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: color }} />
            <span className="text-xs font-bold text-[#333]">{label}</span>
            <span className="text-[11px] text-[#888]">{sublabel}</span>
            {(totalConvert > 0 || totalAdd > 0) && (
              <span className="text-[11px] text-[#2e7d32] font-semibold">
                {totalConvert > 0 && `${totalConvert} converting`}
                {totalConvert > 0 && totalAdd > 0 && ', '}
                {totalAdd > 0 && `${totalAdd} new`}
              </span>
            )}
          </div>
        </td>
      </tr>

      {open && items.map((meta) => {
        const baselineEntry = baseline[meta.key] ?? { existing_diesel: 0, existing_electric: 0 }
        const scenarioEntry = scenario[meta.key] ?? { num_to_convert: 0, num_to_add: 0 }
        return (
          <EquipmentRow
            key={meta.key}
            meta={meta}
            baselineEntry={baselineEntry}
            scenarioEntry={scenarioEntry}
            onChange={(updated) => onChange({ ...scenario, [meta.key]: updated })}
          />
        )
      })}
    </>
  )
}

export default function ScenarioEquipmentTable({
  terminalType,
  baseline,
  scenario,
  onChange,
}: Props) {
  // Filter equipment by terminal type
  const filteredEquipment = PIECE_EQUIPMENT.filter((e) =>
    e.terminalTypes.includes(terminalType)
  )

  // Calculate overall totals
  let totalBaselineDiesel = 0
  let totalBaselineElectric = 0
  let totalConvert = 0
  let totalAdd = 0

  for (const item of filteredEquipment) {
    const base = baseline[item.key] ?? { existing_diesel: 0, existing_electric: 0 }
    const scen = scenario[item.key] ?? { num_to_convert: 0, num_to_add: 0 }
    totalBaselineDiesel += base.existing_diesel
    totalBaselineElectric += base.existing_electric
    totalConvert += Math.min(scen.num_to_convert, base.existing_diesel)
    totalAdd += scen.num_to_add
  }

  const scenarioElectric = totalBaselineElectric + totalConvert + totalAdd
  const scenarioDiesel = totalBaselineDiesel - totalConvert

  // Helper to copy baseline as "convert all"
  function convertAll() {
    const updated: Record<string, ScenarioEquipmentEntry> = {}
    for (const item of filteredEquipment) {
      const base = baseline[item.key] ?? { existing_diesel: 0, existing_electric: 0 }
      updated[item.key] = {
        num_to_convert: base.existing_diesel,
        num_to_add: scenario[item.key]?.num_to_add ?? 0,
      }
    }
    onChange(updated)
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
      <table className="w-full">
        <thead>
          <tr>
            <th className="text-left py-3 px-3 text-[11px] font-bold uppercase text-[#666] bg-white w-[22%]">
              Equipment
            </th>
            <th colSpan={2} className="text-center py-3 px-3 text-[11px] font-bold uppercase bg-[#f0f0f0] text-[#555] w-[14%]">
              Baseline
              <span className="block text-[9px] font-normal text-[#888]">(current fleet)</span>
            </th>
            <th className="text-center py-3 px-3 text-[11px] font-bold uppercase bg-[#fff3e0] text-[#bf360c] w-[16%]">
              Convert
              <span className="block text-[9px] font-normal text-[#d4651e]">(diesel → electric)</span>
            </th>
            <th className="text-center py-3 px-3 text-[11px] font-bold uppercase bg-[#e8f5e9] text-[#2e7d32] w-[16%]">
              Add New
              <span className="block text-[9px] font-normal text-[#388e3c]">(electric units)</span>
            </th>
            <th colSpan={2} className="text-center py-3 px-3 text-[11px] font-bold uppercase bg-[#dceefa] text-[#0d47a1] w-[16%]">
              Scenario Fleet
              <span className="block text-[9px] font-normal text-[#2d5480]">(resulting)</span>
            </th>
          </tr>
          <tr className="border-b border-gray-200">
            <th className="py-1 px-3 bg-white"></th>
            <th className="py-1 px-3 text-center text-[10px] font-semibold text-[#7a5c10] bg-[#fef3e8]">Diesel</th>
            <th className="py-1 px-3 text-center text-[10px] font-semibold text-[#2d5480] bg-[#eaf3fb]">Electric</th>
            <th className="py-1 px-3 bg-[#fff8f0]"></th>
            <th className="py-1 px-3 bg-[#f1f8e9]"></th>
            <th className="py-1 px-3 text-center text-[10px] font-semibold text-[#7a5c10] bg-[#f0f0f0]">Diesel</th>
            <th className="py-1 px-3 text-center text-[10px] font-semibold text-[#2d5480] bg-[#f0f0f0]">Electric</th>
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
              baseline={baseline}
              scenario={scenario}
              onChange={onChange}
            />
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-gray-300 bg-[#f5f5f5]">
            <td className="py-3 px-3 text-right text-xs font-bold text-[#444]">
              Fleet Totals:
            </td>
            <td className="py-3 px-3 text-center text-sm font-bold text-[#7a5c10] bg-[#fef3e8]">
              {totalBaselineDiesel}
            </td>
            <td className="py-3 px-3 text-center text-sm font-bold text-[#2d5480] bg-[#eaf3fb]">
              {totalBaselineElectric}
            </td>
            <td className="py-3 px-3 text-center text-sm font-bold text-[#bf360c] bg-[#fff8f0]">
              {totalConvert > 0 ? `-${totalConvert}` : '\u2014'}
            </td>
            <td className="py-3 px-3 text-center text-sm font-bold text-[#2e7d32] bg-[#f1f8e9]">
              {totalAdd > 0 ? `+${totalAdd}` : '\u2014'}
            </td>
            <td className="py-3 px-3 text-center text-sm font-bold text-[#7a5c10] bg-[#f0f0f0]">
              {scenarioDiesel}
            </td>
            <td className="py-3 px-3 text-center text-sm font-bold text-[#2d5480] bg-[#f0f0f0]">
              {scenarioElectric}
            </td>
          </tr>
        </tfoot>
      </table>

      {/* Footer with helper buttons */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#f5f5f5] border-t border-gray-100">
        <div className="text-[11px] text-[#666]">
          Conversion CAPEX applies to converted units. New units use full electric CAPEX.
        </div>
        <button
          type="button"
          onClick={convertAll}
          className="text-[11px] font-semibold text-[#bf360c] hover:text-[#8e2000]"
        >
          Convert All Diesel →
        </button>
      </div>
    </div>
  )
}
