'use client'

import type { OnshoreConfig } from '@/lib/types'
import { inputBase, labelBase } from '@/lib/constants'
import EquipmentComparisonTable from './EquipmentComparisonTable'

type Props = {
  onshore: OnshoreConfig
  onChange: (updated: OnshoreConfig) => void
}

export default function OnshoreTab({ onshore, onChange }: Props) {
  return (
    <div className="space-y-6">
      {/* Throughput, area, shore power */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className={labelBase}>Annual TEU Throughput</label>
          <input
            type="number"
            min={0}
            value={onshore.annual_teu || ''}
            placeholder="e.g. 500000"
            onChange={(e) => {
              const v = e.target.value === '' ? 0 : parseInt(e.target.value, 10)
              if (!isNaN(v) && v >= 0) onChange({ ...onshore, annual_teu: v })
            }}
            className={inputBase}
          />
        </div>
        <div>
          <label className={labelBase}>Terminal Area (hectares)</label>
          <input
            type="number"
            min={0}
            step={0.1}
            value={onshore.terminal_area_ha || ''}
            placeholder="e.g. 50"
            onChange={(e) => {
              const v = e.target.value === '' ? 0 : parseFloat(e.target.value)
              if (!isNaN(v) && v >= 0) onChange({ ...onshore, terminal_area_ha: v })
            }}
            className={inputBase}
          />
        </div>
        <div>
          <label className={labelBase}>Shore Power Connections</label>
          <input
            type="number"
            min={0}
            step={1}
            value={onshore.shore_power_connections || ''}
            placeholder="0"
            onChange={(e) => {
              const v = e.target.value === '' ? 0 : parseInt(e.target.value, 10)
              if (!isNaN(v) && v >= 0)
                onChange({ ...onshore, shore_power_connections: v })
            }}
            className={inputBase}
          />
          <p className="text-[10px] text-[#8c8c8c] mt-1">
            Berths with shore power infrastructure (used in scenario calculation)
          </p>
        </div>
      </div>

      {/* Equipment comparison — baseline left / scenario right */}
      <EquipmentComparisonTable
        baseline={onshore.baseline_equipment}
        scenario={onshore.scenario_equipment}
        onBaselineChange={(eq) =>
          onChange({ ...onshore, baseline_equipment: eq })
        }
        onScenarioChange={(eq) =>
          onChange({ ...onshore, scenario_equipment: eq })
        }
      />
    </div>
  )
}
