'use client'

import { useState } from 'react'
import Image from 'next/image'
import { EQUIPMENT_GROUPS, TYPE_COLORS } from '@/lib/constants'
import type { EquipmentMeta } from '@/lib/constants'

type Props = {
  baseline: Record<string, number>
  scenario: Record<string, number>
  onBaselineChange: (updated: Record<string, number>) => void
  onScenarioChange: (updated: Record<string, number>) => void
}

/* ── Single equipment row ─────────────────────────────── */

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
      <tr className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
        {/* Name + expand */}
        <td className="py-2 px-3 pl-8">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="text-[10px] text-[#aaa] hover:text-[#414141] transition-colors w-4 flex-shrink-0"
              title={expanded ? 'Collapse' : 'Learn more'}
            >
              {expanded ? '\u25BC' : '\u25B6'}
            </button>
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="text-[13px] text-[#414141] text-left hover:text-[#3c5e86] transition-colors"
            >
              {meta.name}
            </button>
          </div>
        </td>

        {/* Baseline qty */}
        <td className="py-2 px-3 bg-[#f5f3f0]">
          <input
            type="number"
            min={0}
            step={1}
            value={baselineQty || ''}
            placeholder="0"
            onChange={(e) => onBaselineChange(parseQty(e.target.value))}
            className="w-full px-2 py-1.5 rounded border border-[#d4cfc8] text-sm text-center text-[#414141] bg-white focus:border-[#a89e92] focus:ring-1 focus:ring-[#d4cfc8] focus:outline-none transition-all"
          />
        </td>

        {/* Scenario qty */}
        <td className="py-2 px-3 bg-[#edf5fb]">
          <input
            type="number"
            min={0}
            step={1}
            value={scenarioQty || ''}
            placeholder="0"
            onChange={(e) => onScenarioChange(parseQty(e.target.value))}
            className="w-full px-2 py-1.5 rounded border border-[#b8daf0] text-sm text-center text-[#414141] bg-white focus:border-[#68a4c2] focus:ring-1 focus:ring-[#d4eefa] focus:outline-none transition-all"
          />
        </td>
      </tr>

      {/* Expanded detail */}
      {expanded && (
        <tr className="border-b border-gray-100">
          <td colSpan={3} className="p-0">
            <div className="bg-[#fafafa] px-8 py-4 flex gap-5 items-start">
              {meta.image && (
                <div className="relative w-36 h-24 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                  <Image
                    src={meta.image}
                    alt={meta.name}
                    fill
                    className="object-cover"
                    sizes="144px"
                  />
                </div>
              )}
              <div className="flex-1 space-y-1.5 text-xs">
                <p className="text-[#585858]">{meta.primaryFunction}</p>
                <div>
                  <span className="text-[#8c8c8c]">Electrification: </span>
                  <span className="text-[#585858] font-medium">{meta.electrificationStatus}</span>
                </div>
                <div>
                  <span className="text-[#8c8c8c]">Challenges: </span>
                  <span className="text-[#585858]">{meta.challenges}</span>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

/* ── Collapsible category group ───────────────────────── */

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
  items: readonly EquipmentMeta[]
  baseline: Record<string, number>
  scenario: Record<string, number>
  onBaselineChange: (updated: Record<string, number>) => void
  onScenarioChange: (updated: Record<string, number>) => void
}) {
  const [open, setOpen] = useState(false)
  const count = items.reduce(
    (s, m) => s + (baseline[m.key] || 0) + (scenario[m.key] || 0),
    0,
  )

  return (
    <>
      {/* Group header */}
      <tr
        className="cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <td className="py-2.5 px-3 border-b border-gray-200" colSpan={3}>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[#8c8c8c] w-4 flex-shrink-0">
              {open ? '\u25BC' : '\u25B6'}
            </span>
            <span
              className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
              style={{ backgroundColor: color }}
            />
            <span className="text-xs font-semibold text-[#414141]">
              {label}
            </span>
            <span className="text-[10px] text-[#aaa]">
              ({items.length} types{count > 0 ? ` \u2022 ${count} units` : ''})
            </span>
          </div>
        </td>
      </tr>

      {/* Equipment rows */}
      {open &&
        items.map((meta) => (
          <EquipmentRow
            key={meta.key}
            meta={meta}
            baselineQty={baseline[meta.key] ?? 0}
            scenarioQty={scenario[meta.key] ?? 0}
            onBaselineChange={(qty) =>
              onBaselineChange({ ...baseline, [meta.key]: qty })
            }
            onScenarioChange={(qty) =>
              onScenarioChange({ ...scenario, [meta.key]: qty })
            }
          />
        ))}
    </>
  )
}

/* ── Main component ───────────────────────────────────── */

export default function EquipmentComparisonTable({
  baseline,
  scenario,
  onBaselineChange,
  onScenarioChange,
}: Props) {
  function copyBaselineToScenario() {
    onScenarioChange({ ...baseline })
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
      <table className="w-full">
        <thead>
          <tr>
            <th className="text-left py-3 px-3 text-[10px] font-bold uppercase tracking-wide text-[#8c8c8c] bg-white w-[55%]">
              Equipment
            </th>
            <th className="text-center py-3 px-3 text-[10px] font-bold uppercase tracking-wide bg-[#e8e4de] text-[#7a7267] w-[22.5%]">
              Current Fleet
              <span className="block text-[9px] font-normal normal-case tracking-normal">
                (Diesel / Conventional)
              </span>
            </th>
            <th className="text-center py-3 px-3 text-[10px] font-bold uppercase tracking-wide bg-[#d4eefa] text-[#3c5e86] w-[22.5%]">
              Electrified Fleet
              <span className="block text-[9px] font-normal normal-case tracking-normal">
                (Electric / Battery-Powered)
              </span>
            </th>
          </tr>
        </thead>
        <tbody>
          {EQUIPMENT_GROUPS.map((group) => (
            <CategoryGroup
              key={group.typeKey}
              label={group.label}
              color={group.color}
              items={group.items}
              baseline={baseline}
              scenario={scenario}
              onBaselineChange={onBaselineChange}
              onScenarioChange={onScenarioChange}
            />
          ))}
        </tbody>
      </table>

      {/* Copy baseline → scenario action */}
      <div className="flex items-center justify-end px-4 py-2.5 bg-[#fafafa] border-t border-gray-100">
        <button
          type="button"
          onClick={copyBaselineToScenario}
          className="text-[11px] font-medium text-[#3c5e86] hover:text-[#2a4566] transition-colors"
        >
          Copy Current Fleet → Electrified Fleet
        </button>
      </div>
    </div>
  )
}
