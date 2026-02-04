'use client'

import type { VesselCallConfig } from '@/lib/types'
import { VESSEL_TYPES, inputBase, labelBase } from '@/lib/constants'

type Props = {
  vesselCalls: VesselCallConfig[]
  onChange: (updated: VesselCallConfig[]) => void
}

export default function VesselCallsTable({ vesselCalls, onChange }: Props) {
  function addRow() {
    onChange([
      ...vesselCalls,
      { vessel_type: 'container_small', annual_calls: 0, avg_berth_hours: 0 },
    ])
  }

  function removeRow(index: number) {
    onChange(vesselCalls.filter((_, i) => i !== index))
  }

  function updateRow(index: number, field: keyof VesselCallConfig, value: string | number) {
    const updated = vesselCalls.map((row, i) => {
      if (i !== index) return row
      if (field === 'vessel_type') return { ...row, vessel_type: value as string }
      const n = typeof value === 'string' ? parseFloat(value) || 0 : value
      return { ...row, [field]: n }
    })
    onChange(updated)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <label className={labelBase}>Vessel Calls</label>
        <button
          type="button"
          onClick={addRow}
          className="text-xs font-medium text-[#3c5e86] hover:text-[#2a4566] transition-colors"
        >
          + Add vessel type
        </button>
      </div>

      {vesselCalls.length === 0 ? (
        <p className="text-xs text-[#8c8c8c] italic">
          No vessel calls configured. Click &quot;+ Add vessel type&quot; to begin.
        </p>
      ) : (
        <div className="space-y-2">
          {/* Header */}
          <div className="grid grid-cols-[1fr_120px_120px_32px] gap-2 text-[10px] font-semibold text-[#8c8c8c] uppercase tracking-wide px-1">
            <span>Vessel Type</span>
            <span>Annual Calls</span>
            <span>Avg Berth (hrs)</span>
            <span />
          </div>

          {/* Rows */}
          {vesselCalls.map((row, i) => (
            <div
              key={i}
              className="grid grid-cols-[1fr_120px_120px_32px] gap-2 items-center"
            >
              <select
                value={row.vessel_type}
                onChange={(e) => updateRow(i, 'vessel_type', e.target.value)}
                className={inputBase}
              >
                {VESSEL_TYPES.map((vt) => (
                  <option key={vt.value} value={vt.value}>
                    {vt.label}
                  </option>
                ))}
              </select>

              <input
                type="number"
                min={0}
                value={row.annual_calls || ''}
                placeholder="0"
                onChange={(e) => updateRow(i, 'annual_calls', e.target.value)}
                className={inputBase}
              />

              <input
                type="number"
                min={0}
                step={0.5}
                value={row.avg_berth_hours || ''}
                placeholder="0"
                onChange={(e) => updateRow(i, 'avg_berth_hours', e.target.value)}
                className={inputBase}
              />

              <button
                type="button"
                onClick={() => removeRow(i)}
                className="text-[#9e5858] hover:text-red-700 text-sm font-bold transition-colors"
                title="Remove"
              >
                x
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
