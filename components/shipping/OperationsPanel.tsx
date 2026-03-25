import type { BerthVesselCall, TerminalType } from '@/lib/types'

type Props = {
  terminalType: TerminalType
  annualTeu: number
  vesselCalls: BerthVesselCall[]
  onTeuChange: (value: number) => void
  onVesselCallsChange: (calls: BerthVesselCall[]) => void
  // OPS/DC call counts
  opsCallsPerYear?: number
  dcCallsPerYear?: number
  onOpsCallsChange?: (value: number) => void
  onDcCallsChange?: (value: number) => void
  hasOps?: boolean   // true if any berth has OPS (existing or scenario-enabled)
  hasDc?: boolean    // true if any berth has DC (existing or scenario-enabled)
  readOnly?: boolean // true in scenario mode (total calls read-only, OPS/DC editable)
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

export default function OperationsPanel({
  terminalType,
  annualTeu,
  vesselCalls,
  onTeuChange,
  onVesselCallsChange,
  opsCallsPerYear = 0,
  dcCallsPerYear = 0,
  onOpsCallsChange,
  onDcCallsChange,
  hasOps = false,
  hasDc = false,
  readOnly = false,
}: Props) {
  const segments = VESSEL_SEGMENTS[terminalType] || VESSEL_SEGMENTS.container
  const isContainer = terminalType === 'container'

  function addVesselCall() {
    const defaultKey = segments[0]?.key ?? ''
    const newCall: BerthVesselCall = {
      id: crypto.randomUUID(),
      vessel_segment_key: defaultKey,
      annual_calls: 0,
      avg_berth_hours: DEFAULT_BERTH_HOURS[defaultKey] ?? 12,
    }
    onVesselCallsChange([...vesselCalls, newCall])
  }

  function removeVesselCall(callId: string) {
    onVesselCallsChange(vesselCalls.filter((c) => c.id !== callId))
  }

  function updateVesselCall(callId: string, updates: Partial<BerthVesselCall>) {
    onVesselCallsChange(
      vesselCalls.map((c) => (c.id === callId ? { ...c, ...updates } : c))
    )
  }

  const totalCalls = vesselCalls.reduce((s, c) => s + c.annual_calls, 0)
  const totalHours = vesselCalls.reduce((s, c) => s + c.annual_calls * c.avg_berth_hours, 0)
  const opsAndDcExceeded = (opsCallsPerYear + dcCallsPerYear) > totalCalls

  return (
    <div className="space-y-4">
      {/* Throughput & vessel calls summary */}
      <div className="flex items-center gap-4 flex-wrap">
        {isContainer && !readOnly && (
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-[#555] whitespace-nowrap">
              Annual TEU
            </label>
            <input
              type="number"
              min={0}
              value={annualTeu || ''}
              onChange={(e) => onTeuChange(parseInt(e.target.value) || 0)}
              placeholder="0"
              className="w-32 px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-[#414141] bg-white focus:border-[#3c5e86] focus:ring-1 focus:ring-[#3c5e86] focus:outline-none text-right"
            />
            <span className="text-[10px] text-[#999] uppercase">TEU/yr</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-[#555] whitespace-nowrap">
            Total Calls/Year
          </label>
          <span className="w-28 px-3 py-1.5 rounded-lg border border-gray-100 text-sm text-[#414141] bg-gray-50 text-right tabular-nums">
            {totalCalls.toLocaleString() || '0'}
          </span>
          <span className="text-[10px] text-[#999]">calls/yr</span>
        </div>

        {/* OPS Calls/Year */}
        {hasOps && (
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-[#3c5e86] whitespace-nowrap">
              OPS Calls/Year
            </label>
            <input
              type="number"
              min={0}
              max={totalCalls - dcCallsPerYear}
              value={opsCallsPerYear || ''}
              onChange={(e) => {
                const v = parseInt(e.target.value) || 0
                const maxOps = Math.max(0, totalCalls - dcCallsPerYear)
                onOpsCallsChange?.(Math.min(v, maxOps))
              }}
              placeholder="0"
              className={`w-24 px-3 py-1.5 rounded-lg border text-sm text-right text-[#414141] bg-white focus:ring-1 focus:outline-none ${
                opsAndDcExceeded
                  ? 'border-red-300 focus:border-red-400 focus:ring-red-300'
                  : 'border-gray-200 focus:border-[#3c5e86] focus:ring-[#3c5e86]'
              }`}
            />
          </div>
        )}

        {/* DC Calls/Year */}
        {hasDc && (
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-[#e8850e] whitespace-nowrap">
              DC Calls/Year
            </label>
            <input
              type="number"
              min={0}
              max={totalCalls - opsCallsPerYear}
              value={dcCallsPerYear || ''}
              onChange={(e) => {
                const v = parseInt(e.target.value) || 0
                const maxDc = Math.max(0, totalCalls - opsCallsPerYear)
                onDcCallsChange?.(Math.min(v, maxDc))
              }}
              placeholder="0"
              className={`w-24 px-3 py-1.5 rounded-lg border text-sm text-right text-[#414141] bg-white focus:ring-1 focus:outline-none ${
                opsAndDcExceeded
                  ? 'border-red-300 focus:border-red-400 focus:ring-red-300'
                  : 'border-gray-200 focus:border-[#e8850e] focus:ring-[#e8850e]'
              }`}
            />
          </div>
        )}
      </div>

      {/* Validation warning */}
      {opsAndDcExceeded && (hasOps || hasDc) && (
        <p className="text-xs text-red-500 font-medium">
          OPS + DC calls ({(opsCallsPerYear + dcCallsPerYear).toLocaleString()}) exceed total calls ({totalCalls.toLocaleString()})
        </p>
      )}

      {/* Vessel call table — hidden in read-only (scenario) mode */}
      {!readOnly && (
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
      )}
    </div>
  )
}
