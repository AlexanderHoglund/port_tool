'use client'

import type { PortConfig } from '@/lib/types'
import { PORT_SIZES, TYPICAL_PORT_CONFIGS, inputBase, labelBase, sectionHeading } from '@/lib/constants'

type Props = {
  port: PortConfig
  onChange: (updated: PortConfig) => void
  /** Called when user clicks "Load typical values" for the selected port size */
  onLoadDefaults?: () => void
}

export default function PortIdentitySection({ port, onChange, onLoadDefaults }: Props) {
  const hasTypical = port.size_key !== '' && port.size_key in TYPICAL_PORT_CONFIGS

  return (
    <section className="rounded-2xl border border-gray-100 bg-white shadow-sm p-6">
      <h2 className={sectionHeading}>Port Definition</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Port Name */}
        <div>
          <label className={labelBase}>Port Name</label>
          <input
            type="text"
            value={port.name}
            placeholder="e.g. Rotterdam"
            onChange={(e) => onChange({ ...port, name: e.target.value })}
            className={inputBase}
          />
        </div>

        {/* Location */}
        <div>
          <label className={labelBase}>Location / Region</label>
          <input
            type="text"
            value={port.location}
            placeholder="e.g. Netherlands, EU"
            onChange={(e) => onChange({ ...port, location: e.target.value })}
            className={inputBase}
          />
        </div>
      </div>

      {/* Port Size — development feature */}
      <div className="mt-5 rounded-lg border border-dashed border-[#d1d5db] bg-[#f9fafb] p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-[#e5e7eb] text-[#6b7280]">
            Dev
          </span>
          <span className="text-[11px] text-[#9ca3af]">
            Pre-fill helper — does not affect calculations
          </span>
        </div>
        <div className="max-w-xs">
          <label className={labelBase}>Port Size Category</label>
          <select
            value={port.size_key}
            onChange={(e) =>
              onChange({
                ...port,
                size_key: e.target.value as PortConfig['size_key'],
              })
            }
            className={inputBase}
          >
            {PORT_SIZES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        {/* Load typical values prompt */}
        {hasTypical && onLoadDefaults && (
          <div className="mt-3 flex items-center gap-3 rounded-lg bg-[#f8f6f3] border border-[#e8e4de] px-4 py-3">
            <span className="text-xs text-[#7a7267]">
              Pre-fill with typical equipment & vessel data for a{' '}
              <strong>{PORT_SIZES.find((s) => s.value === port.size_key)?.label}</strong> port?
            </span>
            <button
              type="button"
              onClick={onLoadDefaults}
              className="px-3 py-1.5 rounded-lg bg-[#3c5e86] text-white text-[11px] font-semibold hover:bg-[#2a4566] transition-colors whitespace-nowrap"
            >
              Load Typical Values
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
