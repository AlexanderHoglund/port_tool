'use client'

import { useState, useEffect, useCallback } from 'react'
import type { PortServicesBaseline, PortServicesScenario } from '@/lib/types'
import { createClient } from '@/utils/supabase/client'
import { usePieceContext } from '@/app/piece/context/PieceContext'

// PROFILE_NAME is now derived from context inside components

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
  const { refreshAssumptionFingerprint, currentAssumptionFingerprint, activeAssumptionProfile } = usePieceContext()
  const PROFILE_NAME = activeAssumptionProfile
  const isBaseline = mode === 'baseline'

  // ── Synced assumption values for avg hours per call ──
  // String state for responsive input editing (avoids 0-prefix bug)
  const [tugAvgHoursStr, setTugAvgHoursStr] = useState<string>('4')
  const [pilotAvgHoursStr, setPilotAvgHoursStr] = useState<string>('4')
  const [tugDefault, setTugDefault] = useState<number>(4)
  const [pilotDefault, setPilotDefault] = useState<number>(4)
  const [tugHasOverride, setTugHasOverride] = useState(false)
  const [pilotHasOverride, setPilotHasOverride] = useState(false)

  // Fetch effective avg_hours_per_call from DB (default + overrides)
  const fetchAvgHours = useCallback(async () => {
    const supabase = createClient()

    // Fetch default values from piece_fleet_ops
    const { data: fleetData } = await supabase
      .from('piece_fleet_ops')
      .select('vessel_segment_key, avg_hours_per_call')
      .in('vessel_segment_key', ['tug_70bp', 'pilot_boat'])

    const tugRow = fleetData?.find((r) => r.vessel_segment_key === 'tug_70bp')
    const pilotRow = fleetData?.find((r) => r.vessel_segment_key === 'pilot_boat')
    const tugDef = tugRow?.avg_hours_per_call ?? 4
    const pilotDef = pilotRow?.avg_hours_per_call ?? 4
    setTugDefault(tugDef)
    setPilotDefault(pilotDef)

    // Fetch overrides
    const { data: overrides } = await supabase
      .from('piece_assumption_overrides')
      .select('row_key, custom_value')
      .eq('profile_name', PROFILE_NAME)
      .eq('table_name', 'piece_fleet_ops')
      .eq('column_name', 'avg_hours_per_call')
      .in('row_key', ['tug_70bp', 'pilot_boat'])

    const tugOverride = overrides?.find((o) => o.row_key === 'tug_70bp')
    const pilotOverride = overrides?.find((o) => o.row_key === 'pilot_boat')

    setTugAvgHoursStr(String(tugOverride ? Number(tugOverride.custom_value) : tugDef))
    setPilotAvgHoursStr(String(pilotOverride ? Number(pilotOverride.custom_value) : pilotDef))
    setTugHasOverride(!!tugOverride)
    setPilotHasOverride(!!pilotOverride)
  }, [PROFILE_NAME])

  // Load on mount and whenever assumption fingerprint changes (e.g. changed in assumptions tab)
  useEffect(() => {
    fetchAvgHours()
  }, [fetchAvgHours, currentAssumptionFingerprint])

  // Save override when avg hours changed on dashboard
  const saveAvgHoursOverride = useCallback(async (
    rowKey: 'tug_70bp' | 'pilot_boat',
    value: number,
    defaultValue: number,
  ) => {
    const supabase = createClient()

    if (value === defaultValue) {
      // Value matches default — delete override
      await supabase
        .from('piece_assumption_overrides')
        .delete()
        .eq('profile_name', PROFILE_NAME)
        .eq('table_name', 'piece_fleet_ops')
        .eq('row_key', rowKey)
        .eq('column_name', 'avg_hours_per_call')
    } else {
      // Save/update override
      await supabase
        .from('piece_assumption_overrides')
        .upsert(
          {
            profile_name: PROFILE_NAME,
            table_name: 'piece_fleet_ops',
            row_key: rowKey,
            column_name: 'avg_hours_per_call',
            custom_value: value,
          },
          { onConflict: 'profile_name,table_name,row_key,column_name' }
        )
    }

    await refreshAssumptionFingerprint()
  }, [refreshAssumptionFingerprint, PROFILE_NAME])

  // Save on blur (not on every keystroke)
  const handleTugHoursBlur = () => {
    const value = parseFloat(tugAvgHoursStr) || 0
    setTugAvgHoursStr(String(value))
    setTugHasOverride(value !== tugDefault)
    saveAvgHoursOverride('tug_70bp', value, tugDefault)
  }

  const handlePilotHoursBlur = () => {
    const value = parseFloat(pilotAvgHoursStr) || 0
    setPilotAvgHoursStr(String(value))
    setPilotHasOverride(value !== pilotDefault)
    saveAvgHoursOverride('pilot_boat', value, pilotDefault)
  }

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
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm text-[#414141] bg-white focus:border-[#3c5e86] focus:ring-1 focus:ring-[#3c5e86] focus:outline-none"
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
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm text-[#414141] bg-white focus:border-[#3c5e86] focus:ring-1 focus:ring-[#3c5e86] focus:outline-none"
                  placeholder="0"
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] text-[#666] font-medium">Avg Hours per Call</label>
                {tugHasOverride && (
                  <span className="text-[10px] text-blue-500 font-medium">custom (default: {tugDefault})</span>
                )}
              </div>
              <input
                type="number"
                min={0}
                step={0.5}
                value={tugAvgHoursStr}
                onChange={(e) => setTugAvgHoursStr(e.target.value)}
                onBlur={handleTugHoursBlur}
                className={`w-full px-3 py-2 rounded-lg border text-sm text-[#414141] focus:outline-none ${
                  tugHasOverride
                    ? 'border-blue-300 bg-blue-50/40 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                    : 'border-gray-300 bg-white focus:border-[#3c5e86] focus:ring-1 focus:ring-[#3c5e86]'
                }`}
              />
              <div className="text-[10px] text-[#888] mt-0.5">Synced with Assumptions tab</div>
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
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm text-[#414141] bg-white focus:border-[#3c5e86] focus:ring-1 focus:ring-[#3c5e86] focus:outline-none"
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
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm text-[#414141] bg-white focus:border-[#3c5e86] focus:ring-1 focus:ring-[#3c5e86] focus:outline-none"
                  placeholder="0"
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] text-[#666] font-medium">Avg Hours per Call</label>
                {pilotHasOverride && (
                  <span className="text-[10px] text-blue-500 font-medium">custom (default: {pilotDefault})</span>
                )}
              </div>
              <input
                type="number"
                min={0}
                step={0.5}
                value={pilotAvgHoursStr}
                onChange={(e) => setPilotAvgHoursStr(e.target.value)}
                onBlur={handlePilotHoursBlur}
                className={`w-full px-3 py-2 rounded-lg border text-sm text-[#414141] focus:outline-none ${
                  pilotHasOverride
                    ? 'border-blue-300 bg-blue-50/40 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                    : 'border-gray-300 bg-white focus:border-[#3c5e86] focus:ring-1 focus:ring-[#3c5e86]'
                }`}
              />
              <div className="text-[10px] text-[#888] mt-0.5">Synced with Assumptions tab</div>
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
                  className="w-full px-3 py-2 rounded-lg border border-[#ffcc80] text-sm text-[#414141] bg-[#fff8f0] focus:border-[#e65100] focus:ring-1 focus:ring-[#e65100] focus:outline-none"
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
                  className="w-full px-3 py-2 rounded-lg border border-[#a5d6a7] text-sm text-[#414141] bg-[#f1f8e9] focus:border-[#2e7d32] focus:ring-1 focus:ring-[#2e7d32] focus:outline-none"
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
                  className="w-full px-3 py-2 rounded-lg border border-[#ffcc80] text-sm text-[#414141] bg-[#fff8f0] focus:border-[#e65100] focus:ring-1 focus:ring-[#e65100] focus:outline-none"
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
                  className="w-full px-3 py-2 rounded-lg border border-[#a5d6a7] text-sm text-[#414141] bg-[#f1f8e9] focus:border-[#2e7d32] focus:ring-1 focus:ring-[#2e7d32] focus:outline-none"
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
