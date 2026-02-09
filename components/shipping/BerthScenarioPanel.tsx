'use client'

import type { BerthDefinition, BerthScenarioConfig, TerminalType } from '@/lib/types'

type Props = {
  berths: BerthDefinition[]
  scenarios: BerthScenarioConfig[]
  terminalType: TerminalType
  onChange: (scenarios: BerthScenarioConfig[]) => void
}

// OPS power and CAPEX by vessel segment
// Infrastructure is sized for max vessel → CAPEX uses max_vessel_segment_key
// Current energy use → OPEX uses current_vessel_segment_key
const OPS_DATA: Record<string, { powerMw: number; capexUsd: number }> = {
  // Container
  container_0_3k: { powerMw: 2.0, capexUsd: 754000 },
  container_3_6k: { powerMw: 5.0, capexUsd: 1300000 },
  container_6_10k: { powerMw: 6.0, capexUsd: 1482000 },
  container_10k_plus: { powerMw: 7.5, capexUsd: 1755000 },
  // Cruise
  cruise_0_25k: { powerMw: 4.6, capexUsd: 1227000 },
  cruise_25_100k: { powerMw: 12.0, capexUsd: 2574000 },
  cruise_100_175k: { powerMw: 20.0, capexUsd: 4030000 },
  cruise_175k_plus: { powerMw: 26.0, capexUsd: 5122000 },
  // RoRo
  roro_0_4k: { powerMw: 2.0, capexUsd: 754000 },
  roro_4_7k: { powerMw: 4.0, capexUsd: 1118000 },
  roro_7k_plus: { powerMw: 6.5, capexUsd: 1573000 },
}

// DC charging CAPEX (simplified - per berth)
const DC_CAPEX_PER_BERTH = 500000 // $500K per DC installation

// Vessel segment display names
const SEGMENT_NAMES: Record<string, string> = {
  container_0_3k: '0-3K TEU',
  container_3_6k: '3-6K TEU',
  container_6_10k: '6-10K TEU',
  container_10k_plus: '10K+ TEU',
  cruise_0_25k: '0-25K GT',
  cruise_25_100k: '25-100K GT',
  cruise_100_175k: '100-175K GT',
  cruise_175k_plus: '175K+ GT',
  roro_0_4k: '0-4K CEU',
  roro_4_7k: '4-7K CEU',
  roro_7k_plus: '7K+ CEU',
}

export default function BerthScenarioPanel({ berths, scenarios, onChange }: Props) {
  // Ensure all berths have scenario configs
  const getScenario = (berthId: string): BerthScenarioConfig => {
    const existing = scenarios.find((s) => s.berth_id === berthId)
    if (existing) return existing
    return { berth_id: berthId, ops_enabled: false, dc_enabled: false }
  }

  function updateScenario(berthId: string, updates: Partial<BerthScenarioConfig>) {
    const existing = scenarios.find((s) => s.berth_id === berthId)
    if (existing) {
      onChange(scenarios.map((s) => (s.berth_id === berthId ? { ...s, ...updates } : s)))
    } else {
      onChange([...scenarios, { berth_id: berthId, ops_enabled: false, dc_enabled: false, ...updates }])
    }
  }

  // Calculate totals
  // CAPEX / infrastructure MW uses max_vessel_segment_key
  // Current operational MW uses current_vessel_segment_key
  let totalDesignMw = 0
  let totalCurrentMw = 0
  let totalOpsCapex = 0
  let totalDcCapex = 0
  let opsExistingCount = 0
  let opsNewCount = 0
  let dcExistingCount = 0
  let dcNewCount = 0

  for (const berth of berths) {
    const scenario = getScenario(berth.id)
    const maxData = OPS_DATA[berth.max_vessel_segment_key] ?? { powerMw: 2.0, capexUsd: 754000 }
    const currentData = OPS_DATA[berth.current_vessel_segment_key] ?? { powerMw: 2.0, capexUsd: 754000 }

    if (berth.ops_existing) {
      totalDesignMw += maxData.powerMw
      totalCurrentMw += currentData.powerMw
      opsExistingCount++
    } else if (scenario.ops_enabled) {
      totalDesignMw += maxData.powerMw
      totalCurrentMw += currentData.powerMw
      totalOpsCapex += maxData.capexUsd  // CAPEX sized for max vessel
      opsNewCount++
    }

    if (berth.dc_existing) {
      dcExistingCount++
    } else if (scenario.dc_enabled) {
      totalDcCapex += DC_CAPEX_PER_BERTH
      dcNewCount++
    }
  }

  const totalOpsCount = opsExistingCount + opsNewCount
  const totalDcCount = dcExistingCount + dcNewCount

  // Enable OPS on all berths that don't already have it
  function enableAllOps() {
    const updated = berths.map((b) => {
      const existing = scenarios.find((s) => s.berth_id === b.id)
      return {
        berth_id: b.id,
        ops_enabled: true,
        dc_enabled: existing?.dc_enabled ?? false,
      }
    })
    onChange(updated)
  }

  if (berths.length === 0) {
    return (
      <div className="text-sm text-[#777] text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-300">
        No berths defined. Add berths in the Baseline section first.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-[#666]">
          <strong>Design MW</strong> and <strong>CAPEX</strong> are sized for max vessel capacity. <strong>Current MW</strong> reflects today&apos;s operational use.
        </p>
        <button
          type="button"
          onClick={enableAllOps}
          className="text-[11px] font-semibold text-[#3c5e86] hover:text-[#2a4566] shrink-0 ml-4"
        >
          Enable OPS on All
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-3 text-[11px] font-bold uppercase text-[#666] w-10">#</th>
              <th className="text-left py-3 px-3 text-[11px] font-bold uppercase text-[#666]">Berth</th>
              <th className="text-left py-3 px-3 text-[11px] font-bold uppercase text-[#666]">
                Max / Current
              </th>
              <th className="text-center py-3 px-3 text-[11px] font-bold uppercase bg-[#dceefa] text-[#0d47a1] w-14">
                OPS
              </th>
              <th className="text-center py-3 px-3 text-[11px] font-bold uppercase text-[#666] w-14">Status</th>
              <th className="text-center py-3 px-3 text-[11px] font-bold uppercase text-[#666] w-20">
                Design MW
                <span className="block text-[9px] font-normal text-[#999]">(max vessel)</span>
              </th>
              <th className="text-center py-3 px-3 text-[11px] font-bold uppercase text-[#666] w-20">
                Current MW
                <span className="block text-[9px] font-normal text-[#999]">(operating)</span>
              </th>
              <th className="text-center py-3 px-3 text-[11px] font-bold uppercase text-[#666] w-24">OPS CAPEX</th>
              <th className="text-center py-3 px-3 text-[11px] font-bold uppercase bg-[#ffe0b2] text-[#bf360c] w-14">
                DC
              </th>
              <th className="text-center py-3 px-3 text-[11px] font-bold uppercase text-[#666] w-14">Status</th>
              <th className="text-center py-3 px-3 text-[11px] font-bold uppercase text-[#666] w-24">DC CAPEX</th>
            </tr>
          </thead>
          <tbody>
            {berths.map((berth) => {
              const scenario = getScenario(berth.id)
              const maxData = OPS_DATA[berth.max_vessel_segment_key] ?? { powerMw: 2.0, capexUsd: 754000 }
              const currentData = OPS_DATA[berth.current_vessel_segment_key] ?? { powerMw: 2.0, capexUsd: 754000 }
              const maxLabel = SEGMENT_NAMES[berth.max_vessel_segment_key] ?? berth.max_vessel_segment_key
              const currentLabel = SEGMENT_NAMES[berth.current_vessel_segment_key] ?? berth.current_vessel_segment_key

              const hasOps = berth.ops_existing || scenario.ops_enabled
              const opsIsNew = !berth.ops_existing && scenario.ops_enabled
              const dcIsNew = !berth.dc_existing && scenario.dc_enabled

              return (
                <tr key={berth.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-2 px-3">
                    <span className="text-[#777] font-mono text-xs">{berth.berth_number}</span>
                  </td>
                  <td className="py-2 px-3 text-[#333] font-medium">
                    {berth.berth_name}
                  </td>
                  <td className="py-2 px-3 text-xs">
                    <div className="text-[#333] font-medium">{maxLabel}</div>
                    {maxLabel !== currentLabel && (
                      <div className="text-[#888] text-[10px]">operating: {currentLabel}</div>
                    )}
                  </td>

                  {/* OPS checkbox */}
                  <td className="py-2 px-3 text-center bg-[#eef5fc]">
                    {berth.ops_existing ? (
                      <span className="text-xs font-bold text-[#0d47a1]">&#10003;</span>
                    ) : (
                      <input
                        type="checkbox"
                        checked={scenario.ops_enabled}
                        onChange={(e) => updateScenario(berth.id, { ops_enabled: e.target.checked })}
                        className="w-4 h-4 text-[#1565c0] rounded border-gray-300 focus:ring-[#1565c0]"
                      />
                    )}
                  </td>

                  {/* OPS status */}
                  <td className="py-2 px-3 text-center text-[10px]">
                    {berth.ops_existing ? (
                      <span className="inline-block px-1.5 py-0.5 rounded bg-[#dceefa] text-[#0d47a1] font-bold">Existing</span>
                    ) : scenario.ops_enabled ? (
                      <span className="inline-block px-1.5 py-0.5 rounded bg-[#fff3e0] text-[#bf360c] font-bold">New</span>
                    ) : (
                      <span className="text-[#bbb]">—</span>
                    )}
                  </td>

                  {/* Design MW (from max vessel) */}
                  <td className="py-2 px-3 text-center text-xs">
                    {hasOps ? (
                      <span className="text-[#0d47a1] font-semibold">{maxData.powerMw}</span>
                    ) : (
                      <span className="text-[#bbb]">—</span>
                    )}
                  </td>

                  {/* Current MW (from operating vessel) */}
                  <td className="py-2 px-3 text-center text-xs">
                    {hasOps ? (
                      <span className="text-[#555] font-medium">{currentData.powerMw}</span>
                    ) : (
                      <span className="text-[#bbb]">—</span>
                    )}
                  </td>

                  {/* OPS CAPEX (sized for max vessel) */}
                  <td className="py-2 px-3 text-center text-xs">
                    {berth.ops_existing ? (
                      <span className="text-[#999]">$0</span>
                    ) : opsIsNew ? (
                      <span className="text-[#333] font-medium">${(maxData.capexUsd / 1000).toLocaleString()}K</span>
                    ) : (
                      <span className="text-[#bbb]">—</span>
                    )}
                  </td>

                  {/* DC checkbox */}
                  <td className="py-2 px-3 text-center bg-[#fff5ec]">
                    {berth.dc_existing ? (
                      <span className="text-xs font-bold text-[#bf360c]">&#10003;</span>
                    ) : (
                      <input
                        type="checkbox"
                        checked={scenario.dc_enabled}
                        onChange={(e) => updateScenario(berth.id, { dc_enabled: e.target.checked })}
                        className="w-4 h-4 text-[#e65100] rounded border-gray-300 focus:ring-[#e65100]"
                      />
                    )}
                  </td>

                  {/* DC status */}
                  <td className="py-2 px-3 text-center text-[10px]">
                    {berth.dc_existing ? (
                      <span className="inline-block px-1.5 py-0.5 rounded bg-[#ffe0b2] text-[#bf360c] font-bold">Existing</span>
                    ) : scenario.dc_enabled ? (
                      <span className="inline-block px-1.5 py-0.5 rounded bg-[#fff3e0] text-[#bf360c] font-bold">New</span>
                    ) : (
                      <span className="text-[#bbb]">—</span>
                    )}
                  </td>

                  {/* DC CAPEX */}
                  <td className="py-2 px-3 text-center text-xs">
                    {berth.dc_existing ? (
                      <span className="text-[#999]">$0</span>
                    ) : dcIsNew ? (
                      <span className="text-[#333] font-medium">${(DC_CAPEX_PER_BERTH / 1000).toLocaleString()}K</span>
                    ) : (
                      <span className="text-[#bbb]">—</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-200 bg-[#f5f5f5]">
              <td colSpan={3} className="py-3 px-3 text-right text-[11px] font-semibold text-[#666]">
                Totals:
              </td>
              <td className="py-3 px-3 text-center text-xs font-bold text-[#0d47a1] bg-[#dceefa]">
                {totalOpsCount}/{berths.length}
              </td>
              <td className="py-3 px-3 text-center text-[10px] text-[#666]">
                {opsExistingCount > 0 && <span>{opsExistingCount} existing</span>}
                {opsExistingCount > 0 && opsNewCount > 0 && ' + '}
                {opsNewCount > 0 && <span className="text-[#bf360c] font-semibold">{opsNewCount} new</span>}
              </td>
              <td className="py-3 px-3 text-center text-xs font-bold text-[#0d47a1]">
                {totalDesignMw.toFixed(1)} MW
              </td>
              <td className="py-3 px-3 text-center text-xs font-medium text-[#555]">
                {totalCurrentMw.toFixed(1)} MW
              </td>
              <td className="py-3 px-3 text-center text-xs font-bold text-[#333]">
                ${(totalOpsCapex / 1000000).toFixed(2)}M
              </td>
              <td className="py-3 px-3 text-center text-xs font-bold text-[#bf360c] bg-[#fff5ec]">
                {totalDcCount}/{berths.length}
              </td>
              <td className="py-3 px-3 text-center text-[10px] text-[#666]">
                {dcExistingCount > 0 && <span>{dcExistingCount} existing</span>}
                {dcExistingCount > 0 && dcNewCount > 0 && ' + '}
                {dcNewCount > 0 && <span className="text-[#bf360c] font-semibold">{dcNewCount} new</span>}
              </td>
              <td className="py-3 px-3 text-center text-xs font-bold text-[#333]">
                ${(totalDcCapex / 1000000).toFixed(2)}M
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="grid grid-cols-2 gap-4 text-[11px] text-[#555]">
        <div className="bg-[#eef5fc] rounded-lg p-3 border border-[#c5ddf0]">
          <div className="font-bold text-[#0d47a1] mb-1">OPS (Onshore Power Supply)</div>
          <p>Infrastructure sized for max vessel capacity. Design MW and CAPEX reflect the largest vessel the berth can handle.
          Current MW shows actual power draw based on today&apos;s operating segment.</p>
        </div>
        <div className="bg-[#fff5ec] rounded-lg p-3 border border-[#ffd6a5]">
          <div className="font-bold text-[#bf360c] mb-1">DC (Fast Charging)</div>
          <p>High-power DC charging infrastructure for electric or hybrid vessels.
          CAPEX only applies to newly installed berths — existing DC infrastructure has no additional cost.</p>
        </div>
      </div>
    </div>
  )
}
