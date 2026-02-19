'use client'

import type { BuildingsLightingConfig } from '@/lib/types'

type Props = {
  config: BuildingsLightingConfig
  onChange: (config: BuildingsLightingConfig) => void
}

function parseNum(raw: string, defaultVal: number = 0): number {
  if (raw === '') return defaultVal
  const n = parseFloat(raw)
  return isNaN(n) || n < 0 ? defaultVal : n
}

export default function BuildingsLightingPanel({ config, onChange }: Props) {
  const totalAnnualKwh =
    (config.buildings_annual_kwh ?? 0) +
    (config.lighting_annual_kwh ?? 0) +
    (config.other_annual_kwh ?? 0)

  return (
    <div className="space-y-5">
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-[#fafafa]">
              <th className="text-left py-2 px-3 text-[10px] font-bold uppercase text-[#8c8c8c]">Category</th>
              <th className="text-center py-2 px-3 text-[10px] font-bold uppercase text-[#8c8c8c] w-40">Annual kWh</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-2 px-3">
                <span className="text-[#414141]">Buildings</span>
                <span className="text-[10px] text-[#8c8c8c] block">Offices, warehouses, workshops</span>
              </td>
              <td className="py-2 px-3">
                <input
                  type="number"
                  min={0}
                  value={config.buildings_annual_kwh || ''}
                  placeholder="0"
                  onChange={(e) => onChange({ ...config, buildings_annual_kwh: parseNum(e.target.value) })}
                  className="w-full px-2 py-1.5 rounded border border-gray-200 text-sm text-center text-[#414141] bg-white focus:border-[#3c5e86] focus:outline-none"
                />
              </td>
            </tr>
            <tr className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-2 px-3">
                <span className="text-[#414141]">Lighting</span>
                <span className="text-[10px] text-[#8c8c8c] block">High mast, area, roadway lighting</span>
              </td>
              <td className="py-2 px-3">
                <input
                  type="number"
                  min={0}
                  value={config.lighting_annual_kwh || ''}
                  placeholder="0"
                  onChange={(e) => onChange({ ...config, lighting_annual_kwh: parseNum(e.target.value) })}
                  className="w-full px-2 py-1.5 rounded border border-gray-200 text-sm text-center text-[#414141] bg-white focus:border-[#3c5e86] focus:outline-none"
                />
              </td>
            </tr>
            <tr className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-2 px-3">
                <span className="text-[#414141]">Other</span>
                <span className="text-[10px] text-[#8c8c8c] block">Any additional energy consumption</span>
              </td>
              <td className="py-2 px-3">
                <input
                  type="number"
                  min={0}
                  value={config.other_annual_kwh || ''}
                  placeholder="0"
                  onChange={(e) => onChange({ ...config, other_annual_kwh: parseNum(e.target.value) })}
                  className="w-full px-2 py-1.5 rounded border border-gray-200 text-sm text-center text-[#414141] bg-white focus:border-[#3c5e86] focus:outline-none"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className="bg-[#f8fafc] rounded-lg border border-gray-200 p-4">
        <div className="flex justify-between items-center">
          <div>
            <div className="text-[10px] font-bold uppercase text-[#8c8c8c]">Total Annual Energy Consumption</div>
            <div className="text-[10px] text-[#8c8c8c] mt-0.5">
              Buildings + Lighting + Other
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-[#3c5e86]">
              {(totalAnnualKwh / 1000).toLocaleString(undefined, { maximumFractionDigits: 0 })} MWh
            </div>
            <div className="text-[10px] text-[#8c8c8c]">
              {totalAnnualKwh.toLocaleString()} kWh/year
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
