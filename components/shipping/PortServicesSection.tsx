'use client'

import type { PortServicesBaseline, PortServicesScenario } from '@/lib/types'

type Props = {
  baseline: PortServicesBaseline
  scenario: PortServicesScenario
  onBaselineChange: (config: PortServicesBaseline) => void
  onScenarioChange: (config: PortServicesScenario) => void
  mode: 'baseline' | 'scenario'
}

export default function PortServicesSection({
  baseline,
  scenario,
  onBaselineChange,
  onScenarioChange,
  mode,
}: Props) {
  const isBaseline = mode === 'baseline'

  // Convert all to electric in scenario
  const convertAll = () => {
    onScenarioChange({
      tugs_to_convert: baseline.tugs_diesel,
      tugs_to_add: 0,
      pilot_boats_to_convert: baseline.pilot_boats_diesel,
      pilot_boats_to_add: 0,
    })
  }

  // Calculate scenario fleet totals
  const scenarioTugsDiesel = baseline.tugs_diesel - Math.min(scenario.tugs_to_convert, baseline.tugs_diesel)
  const scenarioTugsElectric = baseline.tugs_electric + Math.min(scenario.tugs_to_convert, baseline.tugs_diesel) + scenario.tugs_to_add
  const scenarioPilotDiesel = baseline.pilot_boats_diesel - Math.min(scenario.pilot_boats_to_convert, baseline.pilot_boats_diesel)
  const scenarioPilotElectric = baseline.pilot_boats_electric + Math.min(scenario.pilot_boats_to_convert, baseline.pilot_boats_diesel) + scenario.pilot_boats_to_add

  return (
    <div>
      {!isBaseline && (
        <div className="flex items-center justify-end mb-4">
          <button
            type="button"
            onClick={convertAll}
            className="text-[11px] font-semibold text-[#bf360c] hover:text-[#8e2000]"
          >
            Convert All Diesel →
          </button>
        </div>
      )}

      {isBaseline ? (
        /* ═══════════════════════════════════════════════════════════════════════
           BASELINE MODE - Current diesel + electric counts
           ═══════════════════════════════════════════════════════════════════════ */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Tugs */}
          <div className="space-y-3">
            <div className="text-xs font-bold text-[#444] uppercase tracking-wide">
              Tugs
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-[#666] mb-1 font-medium">Diesel</label>
                <input
                  type="number"
                  min={0}
                  value={baseline.tugs_diesel || ''}
                  onChange={(e) => onBaselineChange({ ...baseline, tugs_diesel: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm text-[#1a1a1a] bg-white focus:border-[#3c5e86] focus:ring-1 focus:ring-[#3c5e86] focus:outline-none"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-[11px] text-[#666] mb-1 font-medium">Electric</label>
                <input
                  type="number"
                  min={0}
                  value={baseline.tugs_electric || ''}
                  onChange={(e) => onBaselineChange({ ...baseline, tugs_electric: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm text-[#1a1a1a] bg-white focus:border-[#3c5e86] focus:ring-1 focus:ring-[#3c5e86] focus:outline-none"
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          {/* Pilot Boats */}
          <div className="space-y-3">
            <div className="text-xs font-bold text-[#444] uppercase tracking-wide">
              Pilot Boats
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-[#666] mb-1 font-medium">Diesel</label>
                <input
                  type="number"
                  min={0}
                  value={baseline.pilot_boats_diesel || ''}
                  onChange={(e) => onBaselineChange({ ...baseline, pilot_boats_diesel: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm text-[#1a1a1a] bg-white focus:border-[#3c5e86] focus:ring-1 focus:ring-[#3c5e86] focus:outline-none"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-[11px] text-[#666] mb-1 font-medium">Electric</label>
                <input
                  type="number"
                  min={0}
                  value={baseline.pilot_boats_electric || ''}
                  onChange={(e) => onBaselineChange({ ...baseline, pilot_boats_electric: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm text-[#1a1a1a] bg-white focus:border-[#3c5e86] focus:ring-1 focus:ring-[#3c5e86] focus:outline-none"
                  placeholder="0"
                />
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ═══════════════════════════════════════════════════════════════════════
           SCENARIO MODE - Convert + Add New
           ═══════════════════════════════════════════════════════════════════════ */
        <div className="space-y-6">
          {/* Tugs */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-[#444] uppercase tracking-wide">
                Tugs
              </div>
              <div className="text-[11px] text-[#666]">
                Baseline: {baseline.tugs_diesel} diesel + {baseline.tugs_electric} electric
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] text-[#bf360c] mb-1 font-semibold">Convert to Electric</label>
                <input
                  type="number"
                  min={0}
                  max={baseline.tugs_diesel}
                  value={scenario.tugs_to_convert || ''}
                  onChange={(e) => onScenarioChange({ ...scenario, tugs_to_convert: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-lg border border-[#ffcc80] text-sm text-[#1a1a1a] bg-[#fff8f0] focus:border-[#e65100] focus:ring-1 focus:ring-[#e65100] focus:outline-none"
                  placeholder="0"
                />
                <div className="text-[10px] text-[#888] mt-0.5">max {baseline.tugs_diesel}</div>
              </div>
              <div>
                <label className="block text-[11px] text-[#2e7d32] mb-1 font-semibold">Add New Electric</label>
                <input
                  type="number"
                  min={0}
                  value={scenario.tugs_to_add || ''}
                  onChange={(e) => onScenarioChange({ ...scenario, tugs_to_add: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-lg border border-[#a5d6a7] text-sm text-[#1a1a1a] bg-[#f1f8e9] focus:border-[#2e7d32] focus:ring-1 focus:ring-[#2e7d32] focus:outline-none"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-[11px] text-[#0d47a1] mb-1 font-semibold">Scenario Fleet</label>
                <div className="px-3 py-2 rounded-lg bg-[#dceefa] text-sm text-center">
                  <span className="text-[#7a5c10] font-medium">{scenarioTugsDiesel} diesel</span>
                  {' + '}
                  <span className="text-[#0d47a1] font-bold">{scenarioTugsElectric} electric</span>
                </div>
              </div>
            </div>
          </div>

          {/* Pilot Boats */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-[#444] uppercase tracking-wide">
                Pilot Boats
              </div>
              <div className="text-[11px] text-[#666]">
                Baseline: {baseline.pilot_boats_diesel} diesel + {baseline.pilot_boats_electric} electric
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] text-[#bf360c] mb-1 font-semibold">Convert to Electric</label>
                <input
                  type="number"
                  min={0}
                  max={baseline.pilot_boats_diesel}
                  value={scenario.pilot_boats_to_convert || ''}
                  onChange={(e) => onScenarioChange({ ...scenario, pilot_boats_to_convert: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-lg border border-[#ffcc80] text-sm text-[#1a1a1a] bg-[#fff8f0] focus:border-[#e65100] focus:ring-1 focus:ring-[#e65100] focus:outline-none"
                  placeholder="0"
                />
                <div className="text-[10px] text-[#888] mt-0.5">max {baseline.pilot_boats_diesel}</div>
              </div>
              <div>
                <label className="block text-[11px] text-[#2e7d32] mb-1 font-semibold">Add New Electric</label>
                <input
                  type="number"
                  min={0}
                  value={scenario.pilot_boats_to_add || ''}
                  onChange={(e) => onScenarioChange({ ...scenario, pilot_boats_to_add: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-lg border border-[#a5d6a7] text-sm text-[#1a1a1a] bg-[#f1f8e9] focus:border-[#2e7d32] focus:ring-1 focus:ring-[#2e7d32] focus:outline-none"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-[11px] text-[#0d47a1] mb-1 font-semibold">Scenario Fleet</label>
                <div className="px-3 py-2 rounded-lg bg-[#dceefa] text-sm text-center">
                  <span className="text-[#7a5c10] font-medium">{scenarioPilotDiesel} diesel</span>
                  {' + '}
                  <span className="text-[#0d47a1] font-bold">{scenarioPilotElectric} electric</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <p className="text-[11px] text-[#666] mt-4">
        Offshore equipment includes harbor tugs and pilot boats that support vessel movements.
      </p>
    </div>
  )
}
