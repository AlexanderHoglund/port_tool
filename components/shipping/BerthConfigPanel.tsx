'use client'

import type { BerthDefinition, TerminalType } from '@/lib/types'

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

export default function BerthConfigPanel({ berths, terminalType, onChange }: Props) {
  const segments = VESSEL_SEGMENTS[terminalType] || VESSEL_SEGMENTS.container

  function addBerth() {
    const defaultSegment = segments[0]?.key ?? 'container_0_3k'
    const newBerth: BerthDefinition = {
      id: crypto.randomUUID(),
      berth_number: berths.length + 1,
      berth_name: `Berth ${berths.length + 1}`,
      max_vessel_segment_key: defaultSegment,
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-[#666]">
          <strong>Max vessel</strong> determines infrastructure sizing (CAPEX). Check OPS/DC if the berth already has shore power or DC charging.
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
        <div className="space-y-2">
          {berths.map((berth) => (
            <div key={berth.id} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 bg-white">
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
                  onChange={(e) => updateBerth(berth.id, { max_vessel_segment_key: e.target.value })}
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
          ))}

          <div className="flex items-center justify-end px-4 py-1 text-xs text-[#666]">
            <span className="font-semibold">{berths.length} berth{berths.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
      )}
    </div>
  )
}
