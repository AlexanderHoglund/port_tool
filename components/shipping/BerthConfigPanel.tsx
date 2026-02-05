'use client'

import type { BerthConfig, TerminalType } from '@/lib/types'

type Props = {
  berths: BerthConfig[]
  terminalType: TerminalType
  onChange: (berths: BerthConfig[]) => void
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
  port_services: [
    { key: 'tug_70bp', label: 'Tug (70BP)' },
    { key: 'pilot_boat', label: 'Pilot Boat' },
  ],
}

export default function BerthConfigPanel({ berths, terminalType, onChange }: Props) {
  const segments = VESSEL_SEGMENTS[terminalType] || VESSEL_SEGMENTS.container

  function addBerth() {
    const newBerth: BerthConfig = {
      id: crypto.randomUUID(),
      berth_number: berths.length + 1,
      berth_name: `Berth ${berths.length + 1}`,
      vessel_segment_key: segments[0]?.key ?? 'container_0_3k',
      annual_calls: 200,
      avg_berth_hours: 24,
      ops_enabled: true,
      dc_enabled: false,
    }
    onChange([...berths, newBerth])
  }

  function removeBerth(id: string) {
    onChange(berths.filter((b) => b.id !== id))
  }

  function updateBerth(id: string, updates: Partial<BerthConfig>) {
    onChange(
      berths.map((b) => (b.id === id ? { ...b, ...updates } : b))
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] font-bold uppercase tracking-widest text-[#8c8c8c]">
          Berths ({berths.length})
        </h3>
        <button
          type="button"
          onClick={addBerth}
          className="px-3 py-1.5 rounded-lg bg-[#3c5e86] text-white text-xs font-semibold hover:bg-[#2a4566] transition-colors"
        >
          + Add Berth
        </button>
      </div>

      {berths.length === 0 ? (
        <div className="text-sm text-[#8c8c8c] text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-200">
          No berths configured. Click "Add Berth" to start.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-2 text-[10px] font-bold uppercase text-[#8c8c8c] w-16">#</th>
                <th className="text-left py-2 px-2 text-[10px] font-bold uppercase text-[#8c8c8c]">Name</th>
                <th className="text-left py-2 px-2 text-[10px] font-bold uppercase text-[#8c8c8c]">Vessel Segment</th>
                <th className="text-center py-2 px-2 text-[10px] font-bold uppercase text-[#8c8c8c] w-24">Calls/Year</th>
                <th className="text-center py-2 px-2 text-[10px] font-bold uppercase text-[#8c8c8c] w-24">Avg Hours</th>
                <th className="text-center py-2 px-2 text-[10px] font-bold uppercase text-[#8c8c8c] w-16">OPS</th>
                <th className="text-center py-2 px-2 text-[10px] font-bold uppercase text-[#8c8c8c] w-16">DC</th>
                <th className="w-12"></th>
              </tr>
            </thead>
            <tbody>
              {berths.map((berth) => (
                <tr key={berth.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-2 px-2">
                    <span className="text-[#8c8c8c] font-mono">{berth.berth_number}</span>
                  </td>
                  <td className="py-2 px-2">
                    <input
                      type="text"
                      value={berth.berth_name}
                      onChange={(e) => updateBerth(berth.id, { berth_name: e.target.value })}
                      className="w-full px-2 py-1 rounded border border-gray-200 text-sm text-[#1a1a1a] bg-white focus:border-[#3c5e86] focus:ring-1 focus:ring-[#3c5e86] focus:outline-none"
                    />
                  </td>
                  <td className="py-2 px-2">
                    <select
                      value={berth.vessel_segment_key}
                      onChange={(e) => updateBerth(berth.id, { vessel_segment_key: e.target.value })}
                      className="w-full px-2 py-1 rounded border border-gray-200 text-sm text-[#1a1a1a] bg-white focus:border-[#3c5e86] focus:ring-1 focus:ring-[#3c5e86] focus:outline-none"
                    >
                      {segments.map((s) => (
                        <option key={s.key} value={s.key}>{s.label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2 px-2">
                    <input
                      type="number"
                      min={0}
                      value={berth.annual_calls || ''}
                      onChange={(e) => updateBerth(berth.id, { annual_calls: parseInt(e.target.value) || 0 })}
                      className="w-full px-2 py-1 rounded border border-gray-200 text-sm text-center text-[#1a1a1a] bg-white focus:border-[#3c5e86] focus:ring-1 focus:ring-[#3c5e86] focus:outline-none"
                    />
                  </td>
                  <td className="py-2 px-2">
                    <input
                      type="number"
                      min={0}
                      step={0.5}
                      value={berth.avg_berth_hours || ''}
                      onChange={(e) => updateBerth(berth.id, { avg_berth_hours: parseFloat(e.target.value) || 0 })}
                      className="w-full px-2 py-1 rounded border border-gray-200 text-sm text-center text-[#1a1a1a] bg-white focus:border-[#3c5e86] focus:ring-1 focus:ring-[#3c5e86] focus:outline-none"
                    />
                  </td>
                  <td className="py-2 px-2 text-center">
                    <input
                      type="checkbox"
                      checked={berth.ops_enabled}
                      onChange={(e) => updateBerth(berth.id, { ops_enabled: e.target.checked })}
                      className="w-4 h-4 text-[#3c5e86] rounded border-gray-300 focus:ring-[#3c5e86]"
                    />
                  </td>
                  <td className="py-2 px-2 text-center">
                    <input
                      type="checkbox"
                      checked={berth.dc_enabled}
                      onChange={(e) => updateBerth(berth.id, { dc_enabled: e.target.checked })}
                      className="w-4 h-4 text-[#3c5e86] rounded border-gray-300 focus:ring-[#3c5e86]"
                    />
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
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="text-[10px] text-[#8c8c8c] space-y-1">
        <p><strong>OPS</strong> = Onshore Power Supply (shore power AC infrastructure)</p>
        <p><strong>DC</strong> = DC Fast Charging (for electric vessels)</p>
      </div>
    </div>
  )
}
