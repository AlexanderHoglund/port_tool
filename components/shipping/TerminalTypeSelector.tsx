'use client'

import type { TerminalType } from '@/lib/types'

type Props = {
  value: TerminalType
  onChange: (type: TerminalType) => void
}

const TERMINAL_TYPES: { key: TerminalType; label: string; description: string }[] = [
  {
    key: 'container',
    label: 'Container Terminal',
    description: 'TEU-based throughput, STS/RTG/AGV/TT equipment',
  },
  {
    key: 'cruise',
    label: 'Cruise Terminal',
    description: 'Passenger-based, high shore power demand',
  },
  {
    key: 'roro',
    label: 'RoRo Terminal',
    description: 'Vehicle throughput (CEU), loading ramps',
  },
  {
    key: 'port_services',
    label: 'Port Services',
    description: 'Tugs, pilot boats, workboats',
  },
]

export default function TerminalTypeSelector({ value, onChange }: Props) {
  return (
    <div className="space-y-2">
      <label className="block text-[10px] font-bold uppercase tracking-wide text-[#8c8c8c]">
        Terminal Type
      </label>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {TERMINAL_TYPES.map((type) => (
          <button
            key={type.key}
            type="button"
            onClick={() => onChange(type.key)}
            className={`p-3 rounded-lg border-2 text-left transition-all ${
              value === type.key
                ? 'border-[#3c5e86] bg-[#edf5fb]'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div className="text-sm font-semibold text-[#414141]">{type.label}</div>
            <div className="text-[10px] text-[#8c8c8c] mt-0.5">{type.description}</div>
          </button>
        ))}
      </div>
    </div>
  )
}
