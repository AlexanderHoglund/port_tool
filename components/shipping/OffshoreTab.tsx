'use client'

import type { OffshoreConfig } from '@/lib/types'
import VesselCallsTable from './VesselCallsTable'
import TugConfigPanel from './TugConfigPanel'

type Props = {
  offshore: OffshoreConfig
  onChange: (updated: OffshoreConfig) => void
}

export default function OffshoreTab({ offshore, onChange }: Props) {
  return (
    <div className="space-y-8">
      {/* Vessel calls */}
      <VesselCallsTable
        vesselCalls={offshore.vessel_calls}
        onChange={(vc) => onChange({ ...offshore, vessel_calls: vc })}
      />

      {/* Tug configuration — baseline left / scenario right with distinct colors */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="rounded-lg bg-[#f5f3f0] border border-[#d4cfc8] p-4">
          <TugConfigPanel
            label="Current Tugs (Baseline)"
            tug={offshore.baseline_tugs}
            onChange={(t) => onChange({ ...offshore, baseline_tugs: t })}
            typeOptions={['diesel']}
          />
        </div>

        <div className="rounded-lg bg-[#edf5fb] border border-[#b8daf0] p-4">
          <TugConfigPanel
            label="Target Tugs (Scenario)"
            tug={offshore.scenario_tugs}
            onChange={(t) => onChange({ ...offshore, scenario_tugs: t })}
            typeOptions={['diesel', 'hybrid', 'electric']}
          />
        </div>
      </div>
    </div>
  )
}
