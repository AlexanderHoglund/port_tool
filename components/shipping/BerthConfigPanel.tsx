'use client'

import type { BerthDefinition, BerthVesselCall, TerminalType } from '@/lib/types'

type Props = {
  berths: BerthDefinition[]
  terminalType: TerminalType
  onChange: (berths: BerthDefinition[]) => void
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
  // Container
  container_0_3k: 6,
  container_3_6k: 12,
  container_6_10k: 24,
  container_10k_plus: 36,
  // Cruise
  cruise_0_25k: 8,
  cruise_25_100k: 10,
  cruise_100_175k: 10,
  cruise_175k_plus: 12,
  // RoRo
  roro_0_4k: 8,
  roro_4_7k: 12,
  roro_7k_plus: 16,
}

export default function BerthConfigPanel({ berths, terminalType, onChange }: Props) {
  const segments = VESSEL_SEGMENTS[terminalType] || VESSEL_SEGMENTS.container

  function getSegmentIndex(key: string): number {
    return segments.findIndex((s) => s.key === key)
  }

  /** Segments that are ≤ the max vessel segment for a berth */
  function getAllowedSegments(maxKey: string) {
    const maxIdx = getSegmentIndex(maxKey)
    if (maxIdx < 0) return segments
    return segments.filter((_, i) => i <= maxIdx)
  }

  function addBerth() {
    const defaultSegment = segments[0]?.key ?? 'container_0_3k'
    const newBerth: BerthDefinition = {
      id: crypto.randomUUID(),
      berth_number: berths.length + 1,
      berth_name: `Berth ${berths.length + 1}`,
      max_vessel_segment_key: defaultSegment,
      vessel_calls: [{
        id: crypto.randomUUID(),
        vessel_segment_key: defaultSegment,
        annual_calls: 200,
        avg_berth_hours: DEFAULT_BERTH_HOURS[defaultSegment] ?? 12,
      }],
      ops_existing: false,
      dc_existing: false,
    }
    onChange([...berths, newBerth])
  }

  function removeBerth(id: string) {
    onChange(berths.filter((b) => b.id !== id))
  }

  function updateBerth(id: string, updates: Partial<BerthDefinition>) {
    onChange(
      berths.map((b) => (b.id === id ? { ...b, ...updates } : b))
    )
  }

  function addVesselCall(berthId: string) {
    const berth = berths.find((b) => b.id === berthId)
    if (!berth) return
    const allowed = getAllowedSegments(berth.max_vessel_segment_key)
    const defaultKey = allowed[0]?.key ?? segments[0]?.key ?? ''
    const newCall: BerthVesselCall = {
      id: crypto.randomUUID(),
      vessel_segment_key: defaultKey,
      annual_calls: 0,
      avg_berth_hours: DEFAULT_BERTH_HOURS[defaultKey] ?? 12,
    }
    updateBerth(berthId, { vessel_calls: [...berth.vessel_calls, newCall] })
  }

  function removeVesselCall(berthId: string, callId: string) {
    const berth = berths.find((b) => b.id === berthId)
    if (!berth) return
    updateBerth(berthId, { vessel_calls: berth.vessel_calls.filter((c) => c.id !== callId) })
  }

  function updateVesselCall(berthId: string, callId: string, updates: Partial<BerthVesselCall>) {
    const berth = berths.find((b) => b.id === berthId)
    if (!berth) return
    updateBerth(berthId, {
      vessel_calls: berth.vessel_calls.map((c) =>
        c.id === callId ? { ...c, ...updates } : c
      ),
    })
  }

  function handleMaxSegmentChange(berthId: string, newMaxKey: string) {
    const berth = berths.find((b) => b.id === berthId)
    if (!berth) return
    const newMaxIdx = getSegmentIndex(newMaxKey)
    // Remove vessel calls with segments larger than new max
    const filteredCalls = berth.vessel_calls.filter((c) => {
      const callIdx = getSegmentIndex(c.vessel_segment_key)
      return callIdx <= newMaxIdx
    })
    updateBerth(berthId, {
      max_vessel_segment_key: newMaxKey,
      vessel_calls: filteredCalls,
    })
  }

  // Calculate grand totals
  const totalCalls = berths.reduce((s, b) => s + b.vessel_calls.reduce((cs, c) => cs + c.annual_calls, 0), 0)
  const totalBerthHours = berths.reduce((s, b) => s + b.vessel_calls.reduce((cs, c) => cs + (c.annual_calls * c.avg_berth_hours), 0), 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-[#666]">
          <strong>Max vessel</strong> determines infrastructure sizing (CAPEX). Add vessel call entries to define the traffic mix at each berth.
        </p>
        <button
          type="button"
          onClick={addBerth}
          className="px-3 py-1.5 rounded-lg bg-[#3c5e86] text-white text-xs font-semibold hover:bg-[#2a4566] transition-colors shrink-0 ml-4"
        >
          + Add Berth
        </button>
      </div>

      {berths.length === 0 ? (
        <div className="text-sm text-[#777] text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-300">
          No berths configured. Click &quot;Add Berth&quot; to start.
        </div>
      ) : (
        <div className="space-y-3">
          {berths.map((berth) => {
            const berthCalls = berth.vessel_calls.reduce((s, c) => s + c.annual_calls, 0)
            const berthHours = berth.vessel_calls.reduce((s, c) => s + (c.annual_calls * c.avg_berth_hours), 0)
            const allowed = getAllowedSegments(berth.max_vessel_segment_key)

            return (
              <div key={berth.id} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                {/* Berth header row */}
                <div className="flex items-center gap-3 px-4 py-3 bg-[#fafafa] border-b border-gray-100">
                  <span className="text-[#777] font-mono text-xs font-bold w-6 shrink-0">
                    {berth.berth_number}
                  </span>
                  <input
                    type="text"
                    value={berth.berth_name}
                    onChange={(e) => updateBerth(berth.id, { berth_name: e.target.value })}
                    className="px-2 py-1 rounded border border-gray-200 text-sm text-[#414141] bg-white focus:border-[#3c5e86] focus:ring-1 focus:ring-[#3c5e86] focus:outline-none w-36"
                  />
                  <div className="flex items-center gap-1.5">
                    <label className="text-[10px] font-semibold uppercase text-[#666]">Max Vessel</label>
                    <select
                      value={berth.max_vessel_segment_key}
                      onChange={(e) => handleMaxSegmentChange(berth.id, e.target.value)}
                      className="px-2 py-1 rounded border border-gray-200 text-sm text-[#414141] bg-white focus:border-[#3c5e86] focus:ring-1 focus:ring-[#3c5e86] focus:outline-none font-medium"
                    >
                      {segments.map((s) => (
                        <option key={s.key} value={s.key}>{s.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-3 ml-auto">
                    <label className="flex items-center gap-1.5 text-[10px] font-semibold uppercase">
                      <input
                        type="checkbox"
                        checked={berth.ops_existing ?? false}
                        onChange={(e) => updateBerth(berth.id, { ops_existing: e.target.checked })}
                        className="w-3.5 h-3.5 text-[#1565c0] rounded border-gray-300 focus:ring-[#1565c0]"
                      />
                      <span className="text-[#0d47a1]">OPS Existing</span>
                    </label>
                    <label className="flex items-center gap-1.5 text-[10px] font-semibold uppercase">
                      <input
                        type="checkbox"
                        checked={berth.dc_existing ?? false}
                        onChange={(e) => updateBerth(berth.id, { dc_existing: e.target.checked })}
                        className="w-3.5 h-3.5 text-[#e65100] rounded border-gray-300 focus:ring-[#e65100]"
                      />
                      <span className="text-[#bf360c]">DC Existing</span>
                    </label>
                    <span className="text-[10px] text-[#999] ml-1">
                      {berthCalls.toLocaleString()} calls | {berthHours.toLocaleString()}h
                    </span>
                    <button
                      type="button"
                      onClick={() => removeBerth(berth.id)}
                      className="text-[#9e5858] hover:text-red-700 text-xs font-medium ml-1"
                      title="Remove berth"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Vessel calls sub-table */}
                <div className="px-4 py-2">
                  {berth.vessel_calls.length > 0 && (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <th className="text-left py-1.5 pr-2 text-[10px] font-bold uppercase text-[#888]">Vessel Type</th>
                          <th className="text-center py-1.5 px-2 text-[10px] font-bold uppercase text-[#888] w-24">Calls/Year</th>
                          <th className="text-center py-1.5 px-2 text-[10px] font-bold uppercase text-[#888] w-24">Avg Hours</th>
                          <th className="text-center py-1.5 px-2 text-[10px] font-bold uppercase text-[#888] w-24">Annual Hours</th>
                          <th className="w-8"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {berth.vessel_calls.map((call) => (
                          <tr key={call.id} className="border-b border-gray-50 hover:bg-gray-50">
                            <td className="py-1.5 pr-2">
                              <select
                                value={call.vessel_segment_key}
                                onChange={(e) => {
                                  const key = e.target.value
                                  updateVesselCall(berth.id, call.id, {
                                    vessel_segment_key: key,
                                    avg_berth_hours: DEFAULT_BERTH_HOURS[key] ?? 12,
                                  })
                                }}
                                className="w-full px-2 py-1 rounded border border-gray-200 text-sm text-[#414141] bg-white focus:border-[#3c5e86] focus:ring-1 focus:ring-[#3c5e86] focus:outline-none"
                              >
                                {allowed.map((s) => (
                                  <option key={s.key} value={s.key}>{s.label}</option>
                                ))}
                              </select>
                            </td>
                            <td className="py-1.5 px-2">
                              <input
                                type="number"
                                min={0}
                                value={call.annual_calls || ''}
                                onChange={(e) => updateVesselCall(berth.id, call.id, { annual_calls: parseInt(e.target.value) || 0 })}
                                className="w-full px-2 py-1 rounded border border-gray-200 text-sm text-center text-[#414141] bg-white focus:border-[#3c5e86] focus:ring-1 focus:ring-[#3c5e86] focus:outline-none"
                              />
                            </td>
                            <td className="py-1.5 px-2">
                              <input
                                type="number"
                                min={0}
                                step={0.5}
                                value={call.avg_berth_hours || ''}
                                onChange={(e) => updateVesselCall(berth.id, call.id, { avg_berth_hours: parseFloat(e.target.value) || 0 })}
                                className="w-full px-2 py-1 rounded border border-gray-200 text-sm text-center text-[#414141] bg-white focus:border-[#3c5e86] focus:ring-1 focus:ring-[#3c5e86] focus:outline-none"
                              />
                            </td>
                            <td className="py-1.5 px-2 text-center text-xs text-[#555] font-medium">
                              {(call.annual_calls * call.avg_berth_hours).toLocaleString()}h
                            </td>
                            <td className="py-1.5 pl-1">
                              <button
                                type="button"
                                onClick={() => removeVesselCall(berth.id, call.id)}
                                className="text-[#aaa] hover:text-[#9e5858] text-xs"
                                title="Remove call"
                              >
                                ✕
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                  <button
                    type="button"
                    onClick={() => addVesselCall(berth.id)}
                    className="mt-1.5 mb-1 text-[11px] font-medium text-[#3c5e86] hover:text-[#2a4566] transition-colors"
                  >
                    + Add Vessel Call
                  </button>
                </div>
              </div>
            )
          })}

          {/* Grand totals */}
          <div className="flex items-center justify-end gap-4 px-4 py-2 text-xs text-[#666]">
            <span className="font-semibold">Totals:</span>
            <span>{berths.length} berths</span>
            <span>{totalCalls.toLocaleString()} calls/yr</span>
            <span>{totalBerthHours.toLocaleString()} berth-hours/yr</span>
          </div>
        </div>
      )}

      <div className="text-[11px] text-[#666]">
        <p>Check OPS/DC if the berth already has shore power or DC charging infrastructure. New OPS/DC installations are configured in the Scenario section.</p>
      </div>
    </div>
  )
}
