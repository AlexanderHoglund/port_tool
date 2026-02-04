'use client'

import type { TugConfig } from '@/lib/types'
import { inputBase, labelBase } from '@/lib/constants'

type Props = {
  label: string
  tug: TugConfig
  onChange: (updated: TugConfig) => void
  /** Limit available types (baseline = diesel only, scenario = all) */
  typeOptions?: TugConfig['type'][]
}

const TYPE_LABELS: Record<TugConfig['type'], string> = {
  diesel: 'Diesel',
  hybrid: 'Hybrid',
  electric: 'Electric',
}

export default function TugConfigPanel({
  label,
  tug,
  onChange,
  typeOptions = ['diesel', 'hybrid', 'electric'],
}: Props) {
  return (
    <div>
      <label className={labelBase}>{label}</label>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[10px] text-[#8c8c8c] mb-0.5">Type</label>
          <select
            value={tug.type}
            onChange={(e) =>
              onChange({ ...tug, type: e.target.value as TugConfig['type'] })
            }
            className={inputBase}
          >
            {typeOptions.map((t) => (
              <option key={t} value={t}>
                {TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] text-[#8c8c8c] mb-0.5">Count</label>
          <input
            type="number"
            min={0}
            step={1}
            value={tug.count || ''}
            placeholder="0"
            onChange={(e) => {
              const raw = e.target.value
              if (raw === '') { onChange({ ...tug, count: 0 }); return }
              const n = parseInt(raw, 10)
              if (!isNaN(n) && n >= 0) onChange({ ...tug, count: n })
            }}
            className={inputBase}
          />
        </div>
      </div>
    </div>
  )
}
