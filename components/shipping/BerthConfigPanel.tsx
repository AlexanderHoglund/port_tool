'use client'

import type { BerthDefinition, TerminalType } from '@/lib/types'

type Props = {
  berths: BerthDefinition[]
  terminalType: TerminalType
  onChange: (berths: BerthDefinition[]) => void
}

// Vessel segments by terminal type
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

export default function BerthConfigPanel({ berths, terminalType, onChange }: Props) {
  const segments = VESSEL_SEGMENTS[terminalType] || VESSEL_SEGMENTS.container

  function addBerth() {
    const defaultSegment = segments[0]?.key ?? 'container_0_3k'
    const newBerth: BerthDefinition = {
      id: crypto.randomUUID(),
      berth_number: berths.length + 1,
      berth_name: `Berth ${berths.length + 1}`,
      max_vessel_segment_key: defaultSegment,
      current_vessel_segment_key: defaultSegment,
      annual_calls: 200,
      avg_berth_hours: 24,
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

  // Calculate totals
  const totalCalls = berths.reduce((s, b) => s + b.annual_calls, 0)
  const totalBerthHours = berths.reduce((s, b) => s + (b.annual_calls * b.avg_berth_hours), 0)
  const opsExistingCount = berths.filter((b) => b.ops_existing).length
  const dcExistingCount = berths.filter((b) => b.dc_existing).length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-[#666]">
          <strong>Max vessel</strong> determines infrastructure sizing (CAPEX, cables). <strong>Current segment</strong> determines today&apos;s energy use (OPEX).
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
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-2 text-[11px] font-bold uppercase text-[#666] w-10">#</th>
                <th className="text-left py-2 px-2 text-[11px] font-bold uppercase text-[#666]">Name</th>
                <th className="text-left py-2 px-2 text-[11px] font-bold uppercase text-[#666]">
                  Max Vessel
                  <span className="block text-[9px] font-normal text-[#999]">(design capacity)</span>
                </th>
                <th className="text-left py-2 px-2 text-[11px] font-bold uppercase text-[#666]">
                  Current Segment
                  <span className="block text-[9px] font-normal text-[#999]">(operating today)</span>
                </th>
                <th className="text-center py-2 px-2 text-[11px] font-bold uppercase text-[#666] w-20">Calls/Yr</th>
                <th className="text-center py-2 px-2 text-[11px] font-bold uppercase text-[#666] w-20">Avg Hours</th>
                <th className="text-center py-2 px-2 text-[11px] font-bold uppercase bg-[#dceefa] text-[#0d47a1] w-14">
                  OPS
                  <span className="block text-[9px] font-normal">(existing)</span>
                </th>
                <th className="text-center py-2 px-2 text-[11px] font-bold uppercase bg-[#ffe0b2] text-[#bf360c] w-14">
                  DC
                  <span className="block text-[9px] font-normal">(existing)</span>
                </th>
                <th className="text-center py-2 px-2 text-[11px] font-bold uppercase text-[#666] w-24">Annual Hours</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {berths.map((berth) => {
                // Check if current segment is larger than max
                const maxIdx = segments.findIndex((s) => s.key === berth.max_vessel_segment_key)
                const curIdx = segments.findIndex((s) => s.key === berth.current_vessel_segment_key)
                const currentExceedsMax = curIdx > maxIdx && maxIdx >= 0

                return (
                  <tr key={berth.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 px-2">
                      <span className="text-[#777] font-mono text-xs">{berth.berth_number}</span>
                    </td>
                    <td className="py-2 px-2">
                      <input
                        type="text"
                        value={berth.berth_name}
                        onChange={(e) => updateBerth(berth.id, { berth_name: e.target.value })}
                        className="w-full px-2 py-1 rounded border border-gray-200 text-sm text-[#414141] bg-white focus:border-[#3c5e86] focus:ring-1 focus:ring-[#3c5e86] focus:outline-none"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <select
                        value={berth.max_vessel_segment_key}
                        onChange={(e) => {
                          const newMax = e.target.value
                          const newMaxIdx = segments.findIndex((s) => s.key === newMax)
                          // If current exceeds new max, clamp current down
                          const updates: Partial<BerthDefinition> = { max_vessel_segment_key: newMax }
                          if (curIdx > newMaxIdx) {
                            updates.current_vessel_segment_key = newMax
                          }
                          updateBerth(berth.id, updates)
                        }}
                        className="w-full px-2 py-1 rounded border border-gray-200 text-sm text-[#414141] bg-white focus:border-[#3c5e86] focus:ring-1 focus:ring-[#3c5e86] focus:outline-none font-medium"
                      >
                        {segments.map((s) => (
                          <option key={s.key} value={s.key}>{s.label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 px-2">
                      <select
                        value={berth.current_vessel_segment_key}
                        onChange={(e) => updateBerth(berth.id, { current_vessel_segment_key: e.target.value })}
                        className={`w-full px-2 py-1 rounded border text-sm text-[#414141] bg-white focus:border-[#3c5e86] focus:ring-1 focus:ring-[#3c5e86] focus:outline-none ${
                          currentExceedsMax ? 'border-red-400' : 'border-gray-200'
                        }`}
                      >
                        {segments.map((s) => (
                          <option key={s.key} value={s.key}>{s.label}</option>
                        ))}
                      </select>
                      {currentExceedsMax && (
                        <div className="text-[9px] text-red-500 mt-0.5">Exceeds max</div>
                      )}
                    </td>
                    <td className="py-2 px-2">
                      <input
                        type="number"
                        min={0}
                        value={berth.annual_calls || ''}
                        onChange={(e) => updateBerth(berth.id, { annual_calls: parseInt(e.target.value) || 0 })}
                        className="w-full px-2 py-1 rounded border border-gray-200 text-sm text-center text-[#414141] bg-white focus:border-[#3c5e86] focus:ring-1 focus:ring-[#3c5e86] focus:outline-none"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <input
                        type="number"
                        min={0}
                        step={0.5}
                        value={berth.avg_berth_hours || ''}
                        onChange={(e) => updateBerth(berth.id, { avg_berth_hours: parseFloat(e.target.value) || 0 })}
                        className="w-full px-2 py-1 rounded border border-gray-200 text-sm text-center text-[#414141] bg-white focus:border-[#3c5e86] focus:ring-1 focus:ring-[#3c5e86] focus:outline-none"
                      />
                    </td>
                    <td className="py-2 px-2 text-center bg-[#eef5fc]">
                      <input
                        type="checkbox"
                        checked={berth.ops_existing ?? false}
                        onChange={(e) => updateBerth(berth.id, { ops_existing: e.target.checked })}
                        className="w-4 h-4 text-[#1565c0] rounded border-gray-300 focus:ring-[#1565c0]"
                      />
                    </td>
                    <td className="py-2 px-2 text-center bg-[#fff5ec]">
                      <input
                        type="checkbox"
                        checked={berth.dc_existing ?? false}
                        onChange={(e) => updateBerth(berth.id, { dc_existing: e.target.checked })}
                        className="w-4 h-4 text-[#e65100] rounded border-gray-300 focus:ring-[#e65100]"
                      />
                    </td>
                    <td className="py-2 px-2 text-center text-xs text-[#555] font-medium">
                      {(berth.annual_calls * berth.avg_berth_hours).toLocaleString()}h
                    </td>
                    <td className="py-2 px-2">
                      <button
                        type="button"
                        onClick={() => removeBerth(berth.id)}
                        className="text-[#9e5858] hover:text-red-700 text-xs font-medium"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            {berths.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-gray-200 bg-[#f5f5f5]">
                  <td colSpan={4} className="py-2 px-2 text-right text-[11px] font-semibold text-[#666]">
                    Totals:
                  </td>
                  <td className="py-2 px-2 text-center text-xs font-bold text-[#333]">
                    {totalCalls.toLocaleString()}
                  </td>
                  <td className="py-2 px-2 text-center text-xs text-[#999]">
                    —
                  </td>
                  <td className="py-2 px-2 text-center text-xs font-bold text-[#0d47a1]">
                    {opsExistingCount}/{berths.length}
                  </td>
                  <td className="py-2 px-2 text-center text-xs font-bold text-[#bf360c]">
                    {dcExistingCount}/{berths.length}
                  </td>
                  <td className="py-2 px-2 text-center text-xs font-bold text-[#333]">
                    {totalBerthHours.toLocaleString()}h
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}

      <div className="text-[11px] text-[#666]">
        <p>Check OPS/DC if the berth already has shore power or DC charging infrastructure. New OPS/DC installations are configured in the Scenario section.</p>
      </div>
    </div>
  )
}
