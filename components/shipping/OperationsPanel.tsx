'use client'

import { useState } from 'react'
import type { BerthVesselCall, TerminalType } from '@/lib/types'

type Props = {
  terminalType: TerminalType
  annualTeu: number
  annualPassengers?: number
  annualCeu?: number
  vesselCalls: BerthVesselCall[]
  onTeuChange: (value: number) => void
  onPassengersChange?: (value: number | undefined) => void
  onCeuChange?: (value: number | undefined) => void
  onVesselCallsChange: (calls: BerthVesselCall[]) => void
}

// Vessel segments by terminal type (ordered smallest → largest)
const VESSEL_SEGMENTS: Record<TerminalType, { key: string; label: string }[]> = {
  container: [
    { key: 'container_0_3k', label: '0-3K TEU' },
    { key: 'container_3_6k', label: '3-6K TEU' },
    { key: 'container_6_10k', label: '6-10K TEU' },
    { key: 'container_10k_plus', label: '10K+ TEU' },
  ],
  cruise: [
    { key: 'cruise_0_25k', label: '0-25K GT' },
    { key: 'cruise_25_100k', label: '25-100K GT' },
    { key: 'cruise_100_175k', label: '100-175K GT' },
    { key: 'cruise_175k_plus', label: '175K+ GT' },
  ],
  roro: [
    { key: 'roro_0_4k', label: '0-4K CEU' },
    { key: 'roro_4_7k', label: '4-7K CEU' },
    { key: 'roro_7k_plus', label: '7K+ CEU' },
  ],
}

// Default avg berth hours by vessel segment (from DB_FLEET T_ALONG)
const DEFAULT_BERTH_HOURS: Record<string, number> = {
  container_0_3k: 6,
  container_3_6k: 12,
  container_6_10k: 24,
  container_10k_plus: 36,
  cruise_0_25k: 8,
  cruise_25_100k: 10,
  cruise_100_175k: 10,
  cruise_175k_plus: 12,
  roro_0_4k: 8,
  roro_4_7k: 12,
  roro_7k_plus: 16,
}

// Throughput labels per terminal type
const THROUGHPUT_CONFIG: Record<TerminalType, { label: string; unit: string; field: 'teu' | 'passengers' | 'ceu' }> = {
  container: { label: 'Annual TEU', unit: 'TEU', field: 'teu' },
  cruise: { label: 'Annual Passengers', unit: 'passengers', field: 'passengers' },
  roro: { label: 'Annual CEU', unit: 'CEU', field: 'ceu' },
}

export default function OperationsPanel({
  terminalType,
  annualTeu,
  annualPassengers,
  annualCeu,
  vesselCalls,
  onTeuChange,
  onPassengersChange,
  onCeuChange,
  onVesselCallsChange,
}: Props) {
  const segments = VESSEL_SEGMENTS[terminalType] || VESSEL_SEGMENTS.container
  const throughput = THROUGHPUT_CONFIG[terminalType]

  // Pending total: stores user-entered total when no vessel calls exist yet.
  // Once vessel types are added, the total is derived from their sum.
  const [pendingTotal, setPendingTotal] = useState(0)

  const throughputValue =
    throughput.field === 'passengers' ? (annualPassengers ?? 0) :
    throughput.field === 'ceu' ? (annualCeu ?? 0) :
    annualTeu

  function handleThroughputChange(value: number) {
    if (throughput.field === 'passengers') {
      onPassengersChange?.(value)
    } else if (throughput.field === 'ceu') {
      onCeuChange?.(value)
    } else {
      onTeuChange(value)
    }
  }

  /** Distribute a total evenly across N vessel calls, preserving other fields */
  function distributeEvenly(calls: BerthVesselCall[], newTotal: number): BerthVesselCall[] {
    if (calls.length === 0) return calls
    const base = Math.floor(newTotal / calls.length)
    let remainder = newTotal - base * calls.length
    return calls.map((c) => {
      const extra = remainder > 0 ? 1 : 0
      remainder--
      return { ...c, annual_calls: base + extra }
    })
  }

  function handleTotalCallsChange(newTotal: number) {
    if (vesselCalls.length === 0) {
      // No vessel types yet — store as pending for when types are added
      setPendingTotal(newTotal)
      return
    }
    setPendingTotal(0)
    onVesselCallsChange(distributeEvenly(vesselCalls, newTotal))
  }

  function addVesselCall() {
    const defaultKey = segments[0]?.key ?? ''
    const newCall: BerthVesselCall = {
      id: crypto.randomUUID(),
      vessel_segment_key: defaultKey,
      annual_calls: 0,
      avg_berth_hours: DEFAULT_BERTH_HOURS[defaultKey] ?? 12,
    }
    const allCalls = [...vesselCalls, newCall]
    // Use pending total if we had no vessel calls before, otherwise use computed sum
    const targetTotal = vesselCalls.length === 0 && pendingTotal > 0 ? pendingTotal : computedTotal
    onVesselCallsChange(distributeEvenly(allCalls, targetTotal))
    setPendingTotal(0)
  }

  function removeVesselCall(callId: string) {
    onVesselCallsChange(vesselCalls.filter((c) => c.id !== callId))
  }

  function updateVesselCall(callId: string, updates: Partial<BerthVesselCall>) {
    onVesselCallsChange(
      vesselCalls.map((c) => (c.id === callId ? { ...c, ...updates } : c))
    )
  }

  const computedTotal = vesselCalls.reduce((s, c) => s + c.annual_calls, 0)
  // Display: pending total when no vessel calls, computed sum otherwise
  const totalCalls = vesselCalls.length === 0 ? pendingTotal : computedTotal
  const totalHours = vesselCalls.reduce((s, c) => s + c.annual_calls * c.avg_berth_hours, 0)

  return (
    <div className="space-y-4">
      {/* Throughput input */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-[#555] whitespace-nowrap">
            {throughput.label}
          </label>
          <input
            type="number"
            min={0}
            value={throughputValue || ''}
            onChange={(e) => handleThroughputChange(parseInt(e.target.value) || 0)}
            placeholder="0"
            className="w-32 px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-[#414141] bg-white focus:border-[#3c5e86] focus:ring-1 focus:ring-[#3c5e86] focus:outline-none text-right"
          />
          <span className="text-[10px] text-[#999] uppercase">{throughput.unit}/yr</span>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-[#555] whitespace-nowrap">
            Total Calls/Year
          </label>
          <input
            type="number"
            min={0}
            value={totalCalls || ''}
            onChange={(e) => handleTotalCallsChange(parseInt(e.target.value) || 0)}
            placeholder="0"
            className="w-28 px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-[#414141] bg-white focus:border-[#3c5e86] focus:ring-1 focus:ring-[#3c5e86] focus:outline-none text-right"
          />
          <span className="text-[10px] text-[#999]">calls/yr</span>
        </div>
      </div>

      {/* Vessel call table */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-[10px] font-bold uppercase text-[#888] tracking-wider">
            Vessel Calls by Type
          </label>
          <button
            type="button"
            onClick={addVesselCall}
            className="text-[11px] font-medium text-[#3c5e86] hover:text-[#2a4566] transition-colors"
          >
            + Add Vessel Type
          </button>
        </div>

        {vesselCalls.length === 0 ? (
          <div className="text-sm text-[#777] text-center py-6 bg-gray-50 rounded-lg border border-dashed border-gray-300">
            No vessel calls defined. Click &quot;Add Vessel Type&quot; to start.
          </div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-1.5 pr-2 text-[10px] font-bold uppercase text-[#888]">Vessel Type</th>
                  <th className="text-center py-1.5 px-2 text-[10px] font-bold uppercase text-[#888] w-24">Calls/Year</th>
                  <th className="text-center py-1.5 px-2 text-[10px] font-bold uppercase text-[#888] w-24">Avg Hours</th>
                  <th className="text-center py-1.5 px-2 text-[10px] font-bold uppercase text-[#888] w-28">Annual Hours</th>
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody>
                {vesselCalls.map((call) => (
                  <tr key={call.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-1.5 pr-2">
                      <select
                        value={call.vessel_segment_key}
                        onChange={(e) => {
                          const key = e.target.value
                          updateVesselCall(call.id, {
                            vessel_segment_key: key,
                            avg_berth_hours: DEFAULT_BERTH_HOURS[key] ?? 12,
                          })
                        }}
                        className="w-full px-2 py-1 rounded border border-gray-200 text-sm text-[#414141] bg-white focus:border-[#3c5e86] focus:ring-1 focus:ring-[#3c5e86] focus:outline-none"
                      >
                        {segments.map((s) => (
                          <option key={s.key} value={s.key}>{s.label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="py-1.5 px-2">
                      <input
                        type="number"
                        min={0}
                        value={call.annual_calls || ''}
                        onChange={(e) => updateVesselCall(call.id, { annual_calls: parseInt(e.target.value) || 0 })}
                        className="w-full px-2 py-1 rounded border border-gray-200 text-sm text-center text-[#414141] bg-white focus:border-[#3c5e86] focus:ring-1 focus:ring-[#3c5e86] focus:outline-none"
                      />
                    </td>
                    <td className="py-1.5 px-2">
                      <input
                        type="number"
                        min={0}
                        step={0.5}
                        value={call.avg_berth_hours || ''}
                        onChange={(e) => updateVesselCall(call.id, { avg_berth_hours: parseFloat(e.target.value) || 0 })}
                        className="w-full px-2 py-1 rounded border border-gray-200 text-sm text-center text-[#414141] bg-white focus:border-[#3c5e86] focus:ring-1 focus:ring-[#3c5e86] focus:outline-none"
                      />
                    </td>
                    <td className="py-1.5 px-2 text-center text-xs text-[#555] font-medium">
                      {(call.annual_calls * call.avg_berth_hours).toLocaleString()}h
                    </td>
                    <td className="py-1.5 pl-1">
                      <button
                        type="button"
                        onClick={() => removeVesselCall(call.id)}
                        className="text-[#aaa] hover:text-[#9e5858] text-xs"
                        title="Remove"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex items-center justify-end gap-4 px-2 py-2 text-xs text-[#666]">
              <span className="font-semibold">Totals:</span>
              <span>{totalCalls.toLocaleString()} calls/yr</span>
              <span>{totalHours.toLocaleString()} berth-hours/yr</span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
