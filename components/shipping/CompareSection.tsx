'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { loadScenario } from '@/lib/piece-projects'
import type { ScenarioSummary, PiecePortResult } from '@/lib/types'

type Props = {
  scenarioList: ScenarioSummary[]
  activeProjectId: string
  onCompareReady?: (ready: boolean) => void
}

function formatCurrency(val?: number): string {
  if (val === undefined || val === null) return '-'
  const abs = Math.abs(Math.round(val))
  return (val < 0 ? '-$' : '$') + abs.toLocaleString()
}

function formatNumber(n: number, decimals = 0): string {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

type LoadedScenario = {
  id: string
  name: string
  result: PiecePortResult
}

// ── Scenario color palettes (ordered by selection) ──
const SCENARIO_COLORS = [
  { primary: '#3c5e86', lightBg: '#edf5fb', mid: '#a8c8e0', label: 'A' },
  { primary: '#286464', lightBg: '#e8f5f0', mid: '#7fbfb0', label: 'B' },
  { primary: '#bc8e54', lightBg: '#fdf3e6', mid: '#dcc09a', label: 'C' },
] as const

function getScenarioColor(index: number) {
  return SCENARIO_COLORS[index] ?? SCENARIO_COLORS[0]
}

const CAPEX_SEGMENTS = [
  { label: 'Equipment', key: 'equipment_capex_usd' },
  { label: 'Chargers', key: 'charger_capex_usd' },
  { label: 'OPS', key: 'ops_capex_usd' },
  { label: 'DC', key: 'dc_capex_usd' },
  { label: 'Grid', key: 'grid_capex_usd' },
  { label: 'Port Services', key: 'port_services_capex_usd' },
] as const

const METRICS = [
  { label: 'Total CAPEX', key: 'total_capex_usd', format: formatCurrency },
  { label: 'Equipment CAPEX', key: 'equipment_capex_usd', format: formatCurrency },
  { label: 'OPS CAPEX', key: 'ops_capex_usd', format: formatCurrency },
  { label: 'DC CAPEX', key: 'dc_capex_usd', format: formatCurrency },
  { label: 'Grid CAPEX', key: 'grid_capex_usd', format: formatCurrency },
  { label: 'Charger CAPEX', key: 'charger_capex_usd', format: formatCurrency },
  { label: 'Port Services CAPEX', key: 'port_services_capex_usd', format: formatCurrency },
  { label: 'Annual OPEX Savings', key: 'annual_opex_savings_usd', format: (v?: number) => {
    if (v === undefined || v === null) return '-'
    return v > 0 ? formatCurrency(v) : '-'
  }},
  { label: 'Annual OPEX Increase', key: 'annual_opex_savings_usd', format: (v?: number) => {
    if (v === undefined || v === null) return '-'
    return v < 0 ? formatCurrency(Math.abs(v)) : '-'
  }},
  { label: 'CO\u2082 Reduction', key: 'co2_reduction_percent', format: (v?: number) => v !== undefined ? `${v.toFixed(1)}%` : '-' },
  { label: 'CO\u2082 Saved (tons/yr)', key: 'co2_tons_saved', format: (v?: number) => v !== undefined ? formatNumber(v) : '-' },
  { label: 'Simple Payback', key: 'simple_payback_years', format: (v?: number | null) => v !== undefined && v !== null ? `${v.toFixed(1)} years` : '-' },
  { label: 'Diesel Saved (L/yr)', key: 'diesel_liters_saved', format: (v?: number) => v !== undefined ? `${formatNumber(v)} L` : '-' },
]

// ── Best-value direction ──
const LOWER_IS_BETTER = new Set([
  'total_capex_usd', 'equipment_capex_usd', 'ops_capex_usd',
  'dc_capex_usd', 'grid_capex_usd', 'charger_capex_usd',
  'port_services_capex_usd', 'simple_payback_years',
  'scenario_co2_tons',
])
const HIGHER_IS_BETTER = new Set([
  'co2_reduction_percent', 'co2_tons_saved', 'diesel_liters_saved',
  'annual_opex_savings_usd',
])

function findBestIndex(metricKey: string, scenarios: LoadedScenario[]): number | null {
  const values = scenarios.map((s) => {
    const v = (s.result.totals as Record<string, unknown>)[metricKey]
    return typeof v === 'number' ? v : null
  })
  if (values.some((v) => v === null)) return null
  const nums = values as number[]
  if (nums.every((v) => v === nums[0])) return null
  if (LOWER_IS_BETTER.has(metricKey)) return nums.indexOf(Math.min(...nums))
  if (HIGHER_IS_BETTER.has(metricKey)) return nums.indexOf(Math.max(...nums))
  return null
}

function findBestForTable(metricKey: string, metricLabel: string, scenarios: LoadedScenario[]): number | null {
  if (metricLabel === 'Annual OPEX Increase') return null
  if (metricLabel === 'Annual OPEX Savings') {
    const values = scenarios.map((s) => s.result.totals.annual_opex_savings_usd)
    if (values.every((v) => v === values[0])) return null
    const max = Math.max(...values)
    return max > 0 ? values.indexOf(max) : null
  }
  return findBestIndex(metricKey, scenarios)
}

// ── Horizontal comparison bar ──
function CompareBar({
  scenarios,
  metricKey,
  label,
  formatFn,
  unit,
}: {
  scenarios: LoadedScenario[]
  metricKey: string
  label: string
  formatFn: (v: number) => string
  unit?: string
}) {
  const values = scenarios.map(
    (s) => (s.result.totals as unknown as Record<string, number>)[metricKey] ?? 0
  )
  const maxVal = Math.max(...values.map(Math.abs), 1)
  const bestIdx = findBestIndex(metricKey, scenarios)

  return (
    <div>
      <div className="text-xs font-medium text-[#585858] mb-2">{label}</div>
      <div className="space-y-1.5">
        {scenarios.map((s, idx) => {
          const val = values[idx]
          const pct = (Math.abs(val) / maxVal) * 100
          const color = getScenarioColor(idx)
          const isBest = bestIdx === idx
          return (
            <div key={s.id} className="flex items-center gap-2.5">
              <div
                className="w-2 h-8 rounded-full shrink-0"
                style={{ backgroundColor: color.primary }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[10px] text-[#8c8c8c] truncate">{s.name}</span>
                  {isBest && (
                    <span
                      className="text-[8px] font-bold uppercase px-1.5 py-0.5 rounded-full text-white shrink-0"
                      style={{ backgroundColor: color.primary }}
                    >
                      Best
                    </span>
                  )}
                </div>
                <div className="h-6 bg-gray-100 rounded overflow-hidden relative">
                  <div
                    className="h-full rounded transition-all duration-500"
                    style={{
                      width: `${Math.max(pct, 1)}%`,
                      backgroundColor: color.primary,
                      opacity: isBest ? 1 : 0.7,
                    }}
                  />
                </div>
              </div>
              <div className={`w-28 text-right shrink-0 text-xs ${isBest ? 'font-bold' : 'font-medium'} text-[#414141]`}>
                {formatFn(val)}{unit ? ` ${unit}` : ''}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Donut / ring chart for proportions ──
function DonutChart({
  segments,
  size = 120,
  strokeWidth = 18,
  centerText,
}: {
  segments: { value: number; color: string; label: string }[]
  size?: number
  strokeWidth?: number
  centerText?: string
}) {
  const total = segments.reduce((sum, s) => sum + s.value, 0)
  if (total === 0) return null
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  let offset = 0

  return (
    <svg width={size} height={size} className="block">
      {segments.map((seg) => {
        const pct = seg.value / total
        const dashLen = pct * circumference
        const dashOffset = -offset
        offset += dashLen
        if (pct < 0.005) return null
        return (
          <circle
            key={seg.label}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={seg.color}
            strokeWidth={strokeWidth}
            strokeDasharray={`${dashLen} ${circumference - dashLen}`}
            strokeDashoffset={dashOffset}
            strokeLinecap="butt"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        )
      })}
      <text
        x={size / 2}
        y={size / 2}
        textAnchor="middle"
        dominantBaseline="middle"
        className="text-[11px] font-bold fill-[#414141]"
      >
        {centerText ?? formatCurrency(total)}
      </text>
    </svg>
  )
}

// ── Main component ──
export default function CompareSection({ scenarioList, activeProjectId, onCompareReady }: Props) {
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [loadedScenarios, setLoadedScenarios] = useState<LoadedScenario[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setSelectedIds([])
    setLoadedScenarios([])
    onCompareReady?.(false)
  }, [activeProjectId, onCompareReady])

  const toggleScenario = useCallback((id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      if (prev.length < 3) return [...prev, id]
      return prev
    })
  }, [])

  const handleCompare = async () => {
    setLoading(true)
    setError(null)
    try {
      const loaded: LoadedScenario[] = []
      for (const id of selectedIds) {
        const row = await loadScenario(id)
        if (row.result) {
          loaded.push({ id: row.id, name: row.scenario_name, result: row.result as PiecePortResult })
        }
      }
      if (loaded.length < 2) {
        setError('Need at least 2 scenarios with calculated results to compare')
      } else {
        setLoadedScenarios(loaded)
        onCompareReady?.(true)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load scenarios')
    }
    setLoading(false)
  }

  const handleReset = () => {
    setLoadedScenarios([])
    onCompareReady?.(false)
  }

  const calculatedCount = scenarioList.filter((s) => s.has_result).length

  // ── Selection panel ──
  if (loadedScenarios.length === 0) {
    return (
      <div>
        {error && (
          <div
            className="mb-4 rounded-xl px-5 py-3 text-sm border"
            style={{ backgroundColor: '#feeeea', borderColor: '#fac8c2', color: '#9e5858' }}
          >
            {error}
            <button onClick={() => setError(null)} className="ml-2 underline text-xs">dismiss</button>
          </div>
        )}

        {calculatedCount < 2 ? (
          <div className="bg-white/70 rounded-xl p-10 border border-[#ede4f2] text-center">
            <div className="text-[#bebebe] text-5xl mb-4">&#128202;</div>
            <p className="text-sm text-[#414141] font-medium mb-1">
              Not enough calculated scenarios
            </p>
            <p className="text-xs text-[#8c8c8c]">
              Calculate results for at least 2 scenarios to compare them side-by-side.
              Currently {calculatedCount} scenario{calculatedCount !== 1 ? 's' : ''} ha{calculatedCount !== 1 ? 've' : 's'} results.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <label className="block text-xs font-medium text-[#585858] mb-3">
              Select 2–3 scenarios to compare
            </label>
            <div className="space-y-2 mb-4">
              {scenarioList.map((s) => {
                const selIndex = selectedIds.indexOf(s.id)
                const isSelected = selIndex !== -1
                const color = isSelected ? getScenarioColor(selIndex) : null
                return (
                  <label
                    key={s.id}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-lg border cursor-pointer transition-colors ${
                      !s.has_result ? 'opacity-50 cursor-not-allowed' : ''
                    } ${!isSelected ? 'hover:bg-gray-50' : ''}`}
                    style={
                      isSelected && color
                        ? { borderColor: color.primary, backgroundColor: color.lightBg }
                        : { borderColor: '#e5e7eb' }
                    }
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => s.has_result && toggleScenario(s.id)}
                      disabled={!s.has_result}
                      className="w-4 h-4 rounded border-gray-300"
                      style={isSelected && color ? { accentColor: color.primary } : undefined}
                    />
                    {isSelected && color && (
                      <span
                        className="w-5 h-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center shrink-0"
                        style={{ backgroundColor: color.primary }}
                      >
                        {color.label}
                      </span>
                    )}
                    <span className="text-sm text-[#414141] font-medium">{s.scenario_name}</span>
                    {!s.has_result && (
                      <span className="text-[10px] text-[#8c8c8c]">(no results)</span>
                    )}
                    {s.has_result && s.total_capex_usd !== undefined && (
                      <span className="text-[10px] text-[#8c8c8c] ml-auto">
                        CAPEX: {formatCurrency(s.total_capex_usd)}
                      </span>
                    )}
                  </label>
                )
              })}
            </div>

            <button
              onClick={handleCompare}
              disabled={loading || selectedIds.length < 2}
              className="px-6 py-2.5 rounded-lg bg-[#7c5e8a] text-white text-sm font-medium hover:bg-[#6a4e78] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Loading...' : 'Compare'}
            </button>
          </div>
        )}
      </div>
    )
  }

  // ── Comparison results ──
  const maxCapex = Math.max(...loadedScenarios.map((s) => s.result.totals.total_capex_usd), 1)

  return (
    <div className="space-y-6">
      {/* Header + legend */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-5">
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-[#8c8c8c]">
            Comparison
          </h3>
          <div className="flex gap-3">
            {loadedScenarios.map((s, idx) => {
              const color = getScenarioColor(idx)
              return (
                <span key={s.id} className="flex items-center gap-1.5 text-xs font-medium" style={{ color: color.primary }}>
                  <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: color.primary }} />
                  {s.name}
                </span>
              )
            })}
          </div>
        </div>
        <button
          onClick={handleReset}
          className="text-xs text-[#7c5e8a] hover:underline font-medium"
        >
          Change Selection
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════
          METRICS TABLE — side-by-side comparison
         ══════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-[#fafafa]">
              <th className="text-left py-3 px-4 text-[10px] font-bold uppercase text-[#8c8c8c] w-48">
                Metric
              </th>
              {loadedScenarios.map((s, idx) => {
                const color = getScenarioColor(idx)
                return (
                  <th
                    key={s.id}
                    className="text-center py-3 px-4 text-[10px] font-bold uppercase text-[#414141]"
                    style={{ borderTop: `3px solid ${color.primary}` }}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        className="w-2.5 h-2.5 rounded-full inline-block"
                        style={{ backgroundColor: color.primary }}
                      />
                      {s.name}
                    </span>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {METRICS.map((metric) => {
              const bestIdx = findBestForTable(metric.key, metric.label, loadedScenarios)
              return (
                <tr key={`${metric.key}-${metric.label}`} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-2.5 px-4 text-xs font-medium text-[#585858]">
                    {metric.label}
                  </td>
                  {loadedScenarios.map((s, idx) => {
                    const totals = s.result.totals as Record<string, unknown>
                    const val = totals[metric.key]
                    const isBest = bestIdx === idx
                    const color = getScenarioColor(idx)
                    return (
                      <td
                        key={s.id}
                        className={`py-2.5 px-4 text-center text-xs ${
                          isBest ? 'font-bold' : 'font-medium text-[#414141]'
                        }`}
                        style={isBest ? { color: color.primary } : undefined}
                      >
                        {metric.format(val as number)}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* ══════════════════════════════════════════════════════
          VISUAL DIAGRAMS — key differences
         ══════════════════════════════════════════════════════ */}

      {/* ── CAPEX Breakdown: donuts + grouped bars ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-[#8c8c8c] mb-5">
          <Image src="/icons/Icons/Efficiency/Pie chart.svg" alt="" width={16} height={16} className="opacity-40" />
          CAPEX Breakdown
        </h3>

        {/* Donuts aligned under table columns */}
        <div className="flex items-start mb-6">
          <div className="w-24 shrink-0" />
          <div className="flex-1 flex gap-1">
            {loadedScenarios.map((s, idx) => {
              const t = s.result.totals as unknown as Record<string, number>
              const color = getScenarioColor(idx)
              const shadeSteps = ['ff', 'cc', 'aa', '88', '66', '55']
              const segments = CAPEX_SEGMENTS
                .map((seg, i) => ({
                  value: t[seg.key] ?? 0,
                  color: i === 0 ? color.primary : `${color.primary}${shadeSteps[Math.min(i, shadeSteps.length - 1)]}`,
                  label: seg.label,
                }))
                .filter((seg) => seg.value > 0)

              return (
                <div key={s.id} className="flex-1 flex flex-col items-center">
                  <DonutChart segments={segments} size={140} strokeWidth={22} />
                  <span className="text-xs font-semibold mt-2" style={{ color: color.primary }}>{s.name}</span>
                  <div className="mt-2 space-y-0.5">
                    {segments.map((seg) => (
                      <div key={seg.label} className="flex items-center gap-1.5 text-[10px] text-[#8c8c8c]">
                        <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: seg.color }} />
                        {seg.label}: {formatCurrency(seg.value)}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="space-y-3 border-t border-gray-100 pt-5">
          {CAPEX_SEGMENTS.map((seg) => {
            const values = loadedScenarios.map(
              (s) => (s.result.totals as unknown as Record<string, number>)[seg.key] ?? 0
            )
            if (values.every((v) => v <= 0)) return null
            const maxVal = Math.max(...values, 1)
            const bestIdx = findBestIndex(seg.key, loadedScenarios)

            return (
              <div key={seg.key} className="flex items-center gap-3">
                <div className="w-24 text-xs font-medium text-[#585858] text-right shrink-0">
                  {seg.label}
                </div>
                <div className="flex-1 flex gap-1">
                  {loadedScenarios.map((s, idx) => {
                    const val = values[idx]
                    const pct = (val / maxVal) * 100
                    const color = getScenarioColor(idx)
                    const isBest = bestIdx === idx
                    return (
                      <div key={s.id} className="flex-1">
                        <div className="h-7 bg-gray-50 rounded overflow-hidden">
                          <div
                            className="h-full rounded transition-all duration-500"
                            style={{
                              width: `${Math.max(pct, 1)}%`,
                              backgroundColor: color.primary,
                              opacity: isBest ? 1 : 0.55,
                            }}
                          />
                        </div>
                        <div className={`text-[10px] mt-0.5 ${isBest ? 'font-bold' : 'font-medium'} text-[#414141] text-center`}>
                          {formatCurrency(val)}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}

          <div className="flex items-center gap-3 border-t border-gray-200 pt-3">
            <div className="w-24 text-xs font-bold text-[#414141] text-right shrink-0">Total</div>
            <div className="flex-1 flex gap-1">
              {loadedScenarios.map((s, idx) => {
                const total = s.result.totals.total_capex_usd
                const pct = (total / maxCapex) * 100
                const color = getScenarioColor(idx)
                const isBest = findBestIndex('total_capex_usd', loadedScenarios) === idx
                return (
                  <div key={s.id} className="flex-1">
                    <div className="h-8 bg-gray-50 rounded overflow-hidden">
                      <div
                        className="h-full rounded transition-all duration-500"
                        style={{
                          width: `${Math.max(pct, 1)}%`,
                          backgroundColor: color.primary,
                          opacity: isBest ? 1 : 0.55,
                        }}
                      />
                    </div>
                    <div className={`text-xs mt-0.5 ${isBest ? 'font-bold' : 'font-medium'} text-[#414141] text-center`}>
                      {formatCurrency(total)}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Environmental + Savings bars ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-[#8c8c8c] mb-5">
          <Image src="/icons/Icons/Efficiency/Bar Chart.svg" alt="" width={16} height={16} className="opacity-40" />
          Key Differences
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <CompareBar
            scenarios={loadedScenarios}
            metricKey="co2_tons_saved"
            label="CO&#8322; Reduced (tons/yr)"
            formatFn={(v) => formatNumber(v)}
            unit="t"
          />
          <CompareBar
            scenarios={loadedScenarios}
            metricKey="diesel_liters_saved"
            label="Diesel Saved (L/yr)"
            formatFn={(v) => formatNumber(v)}
            unit="L"
          />
          <CompareBar
            scenarios={loadedScenarios}
            metricKey="annual_opex_savings_usd"
            label="Annual OPEX Savings"
            formatFn={(v) => formatCurrency(v) ?? '-'}
          />
          {loadedScenarios.some((s) => s.result.totals.simple_payback_years !== null) && (
            <CompareBar
              scenarios={loadedScenarios}
              metricKey="simple_payback_years"
              label="Simple Payback"
              formatFn={(v) => (v !== null && v !== undefined && v > 0) ? v.toFixed(1) : 'N/A'}
              unit="years"
            />
          )}
        </div>
      </div>

      {/* ── Energy Profile side-by-side ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-[#8c8c8c] mb-5">
          <Image src="/icons/Icons/Energy & Fuels/Energy sources.svg" alt="" width={16} height={16} className="opacity-40" />
          Energy Profile
        </h3>
        <div className={`grid gap-4 ${loadedScenarios.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
          {loadedScenarios.map((s, idx) => {
            const t = s.result.totals
            const color = getScenarioColor(idx)
            const totalEnergy = t.scenario_diesel_liters + t.scenario_kwh / 1000
            const dieselPct = totalEnergy > 0 ? (t.scenario_diesel_liters / totalEnergy) * 100 : 0
            const electricPct = 100 - dieselPct

            return (
              <div
                key={s.id}
                className="rounded-xl p-5 border"
                style={{ borderColor: color.primary + '40', backgroundColor: color.lightBg }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: color.primary }} />
                  <span className="text-sm font-semibold" style={{ color: color.primary }}>{s.name}</span>
                </div>

                <div className="mb-3">
                  <div className="text-[10px] text-[#8c8c8c] mb-1">Energy Mix</div>
                  <div className="flex h-5 rounded-full overflow-hidden bg-gray-200">
                    {dieselPct > 0.5 && (
                      <div className="h-full" style={{ width: `${dieselPct}%`, backgroundColor: '#8c8c8c' }} />
                    )}
                    {electricPct > 0.5 && (
                      <div className="h-full" style={{ width: `${electricPct}%`, backgroundColor: color.primary }} />
                    )}
                  </div>
                  <div className="flex justify-between text-[9px] mt-1 text-[#8c8c8c]">
                    <span>Diesel {dieselPct.toFixed(0)}%</span>
                    <span>Electric {electricPct.toFixed(0)}%</span>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[#8c8c8c]">Diesel</span>
                    <span className="font-semibold text-[#414141]">{formatNumber(t.scenario_diesel_liters)} L/yr</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8c8c8c]">Electricity</span>
                    <span className="font-semibold text-[#414141]">{formatNumber(t.scenario_kwh / 1000000, 2)} GWh/yr</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8c8c8c]">CO&#8322;</span>
                    <span className="font-semibold text-[#414141]">{formatNumber(t.scenario_co2_tons)} t/yr</span>
                  </div>
                  <div className="border-t border-gray-200 pt-1.5 mt-1.5">
                    <div className="flex justify-between">
                      <span className="text-[#8c8c8c]">OPEX</span>
                      <span className="font-semibold text-[#414141]">{formatCurrency(t.scenario_opex_usd)}/yr</span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
