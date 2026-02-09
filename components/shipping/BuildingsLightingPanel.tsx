'use client'

import type { BuildingsLightingConfig } from '@/lib/types'

type Props = {
  config: BuildingsLightingConfig
  onChange: (config: BuildingsLightingConfig) => void
}

// Energy consumption factors
const BUILDING_KWH_PER_SQM_YEAR = {
  warehouse: 50,    // Lower energy (mainly lighting, some HVAC)
  office: 150,      // Higher energy (HVAC, lighting, equipment)
  workshop: 200,    // Highest (machinery, ventilation, lighting)
}

const LIGHTING_WATTS = {
  high_mast: 1000,   // 1000W per light
  area: 400,         // 400W per light
  roadway: 250,      // 250W per light
}

function parseNum(raw: string, defaultVal: number = 0): number {
  if (raw === '') return defaultVal
  const n = parseFloat(raw)
  return isNaN(n) || n < 0 ? defaultVal : n
}

export default function BuildingsLightingPanel({ config, onChange }: Props) {
  // Calculate annual energy consumption
  const buildingKwh =
    (config.warehouse_sqm * BUILDING_KWH_PER_SQM_YEAR.warehouse) +
    (config.office_sqm * BUILDING_KWH_PER_SQM_YEAR.office) +
    (config.workshop_sqm * BUILDING_KWH_PER_SQM_YEAR.workshop)

  const lightingKw =
    (config.high_mast_lights * LIGHTING_WATTS.high_mast / 1000) +
    (config.area_lights * LIGHTING_WATTS.area / 1000) +
    (config.roadway_lights * LIGHTING_WATTS.roadway / 1000)

  const lightingKwh = lightingKw * config.annual_operating_hours

  const totalAnnualKwh = buildingKwh + lightingKwh

  return (
    <div className="space-y-6">
      {/* Buildings Section */}
      <div className="space-y-3">
        <h4 className="text-[11px] font-bold uppercase tracking-widest text-[#8c8c8c]">
          Buildings
        </h4>
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-[#fafafa]">
                <th className="text-left py-2 px-3 text-[10px] font-bold uppercase text-[#8c8c8c]">Building Type</th>
                <th className="text-center py-2 px-3 text-[10px] font-bold uppercase text-[#8c8c8c] w-28">Area (m²)</th>
                <th className="text-center py-2 px-3 text-[10px] font-bold uppercase text-[#8c8c8c] w-28">kWh/m²/yr</th>
                <th className="text-center py-2 px-3 text-[10px] font-bold uppercase text-[#8c8c8c] w-32">Annual kWh</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-2 px-3">
                  <span className="text-[#414141]">Warehouse / Storage</span>
                  <span className="text-[10px] text-[#8c8c8c] block">Lighting, basic HVAC</span>
                </td>
                <td className="py-2 px-3">
                  <input
                    type="number"
                    min={0}
                    value={config.warehouse_sqm || ''}
                    placeholder="0"
                    onChange={(e) => onChange({ ...config, warehouse_sqm: parseNum(e.target.value) })}
                    className="w-full px-2 py-1.5 rounded border border-gray-200 text-sm text-center text-[#1a1a1a] bg-white focus:border-[#3c5e86] focus:outline-none"
                  />
                </td>
                <td className="py-2 px-3 text-center text-xs text-[#8c8c8c]">
                  {BUILDING_KWH_PER_SQM_YEAR.warehouse}
                </td>
                <td className="py-2 px-3 text-center text-xs text-[#414141]">
                  {(config.warehouse_sqm * BUILDING_KWH_PER_SQM_YEAR.warehouse).toLocaleString()}
                </td>
              </tr>
              <tr className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-2 px-3">
                  <span className="text-[#414141]">Office / Administration</span>
                  <span className="text-[10px] text-[#8c8c8c] block">HVAC, lighting, IT equipment</span>
                </td>
                <td className="py-2 px-3">
                  <input
                    type="number"
                    min={0}
                    value={config.office_sqm || ''}
                    placeholder="0"
                    onChange={(e) => onChange({ ...config, office_sqm: parseNum(e.target.value) })}
                    className="w-full px-2 py-1.5 rounded border border-gray-200 text-sm text-center text-[#1a1a1a] bg-white focus:border-[#3c5e86] focus:outline-none"
                  />
                </td>
                <td className="py-2 px-3 text-center text-xs text-[#8c8c8c]">
                  {BUILDING_KWH_PER_SQM_YEAR.office}
                </td>
                <td className="py-2 px-3 text-center text-xs text-[#414141]">
                  {(config.office_sqm * BUILDING_KWH_PER_SQM_YEAR.office).toLocaleString()}
                </td>
              </tr>
              <tr className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-2 px-3">
                  <span className="text-[#414141]">Workshop / Maintenance</span>
                  <span className="text-[10px] text-[#8c8c8c] block">Machinery, ventilation, welding</span>
                </td>
                <td className="py-2 px-3">
                  <input
                    type="number"
                    min={0}
                    value={config.workshop_sqm || ''}
                    placeholder="0"
                    onChange={(e) => onChange({ ...config, workshop_sqm: parseNum(e.target.value) })}
                    className="w-full px-2 py-1.5 rounded border border-gray-200 text-sm text-center text-[#1a1a1a] bg-white focus:border-[#3c5e86] focus:outline-none"
                  />
                </td>
                <td className="py-2 px-3 text-center text-xs text-[#8c8c8c]">
                  {BUILDING_KWH_PER_SQM_YEAR.workshop}
                </td>
                <td className="py-2 px-3 text-center text-xs text-[#414141]">
                  {(config.workshop_sqm * BUILDING_KWH_PER_SQM_YEAR.workshop).toLocaleString()}
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr className="bg-[#f5f5f5]">
                <td colSpan={3} className="py-2 px-3 text-right text-[10px] font-semibold text-[#8c8c8c]">
                  Buildings Total:
                </td>
                <td className="py-2 px-3 text-center text-sm font-bold text-[#414141]">
                  {buildingKwh.toLocaleString()} kWh
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Lighting Section */}
      <div className="space-y-3">
        <h4 className="text-[11px] font-bold uppercase tracking-widest text-[#8c8c8c]">
          Outdoor Lighting
        </h4>
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-[#fafafa]">
                <th className="text-left py-2 px-3 text-[10px] font-bold uppercase text-[#8c8c8c]">Light Type</th>
                <th className="text-center py-2 px-3 text-[10px] font-bold uppercase text-[#8c8c8c] w-24">Count</th>
                <th className="text-center py-2 px-3 text-[10px] font-bold uppercase text-[#8c8c8c] w-20">Watts</th>
                <th className="text-center py-2 px-3 text-[10px] font-bold uppercase text-[#8c8c8c] w-24">Total kW</th>
                <th className="text-center py-2 px-3 text-[10px] font-bold uppercase text-[#8c8c8c] w-32">Annual kWh</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-2 px-3">
                  <span className="text-[#414141]">High Mast Lights</span>
                  <span className="text-[10px] text-[#8c8c8c] block">Container yard, quayside</span>
                </td>
                <td className="py-2 px-3">
                  <input
                    type="number"
                    min={0}
                    value={config.high_mast_lights || ''}
                    placeholder="0"
                    onChange={(e) => onChange({ ...config, high_mast_lights: parseNum(e.target.value) })}
                    className="w-full px-2 py-1.5 rounded border border-gray-200 text-sm text-center text-[#1a1a1a] bg-white focus:border-[#3c5e86] focus:outline-none"
                  />
                </td>
                <td className="py-2 px-3 text-center text-xs text-[#8c8c8c]">
                  {LIGHTING_WATTS.high_mast}W
                </td>
                <td className="py-2 px-3 text-center text-xs text-[#414141]">
                  {(config.high_mast_lights * LIGHTING_WATTS.high_mast / 1000).toFixed(1)}
                </td>
                <td className="py-2 px-3 text-center text-xs text-[#414141]">
                  {(config.high_mast_lights * LIGHTING_WATTS.high_mast / 1000 * config.annual_operating_hours).toLocaleString()}
                </td>
              </tr>
              <tr className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-2 px-3">
                  <span className="text-[#414141]">Area Lights</span>
                  <span className="text-[10px] text-[#8c8c8c] block">Parking, storage areas</span>
                </td>
                <td className="py-2 px-3">
                  <input
                    type="number"
                    min={0}
                    value={config.area_lights || ''}
                    placeholder="0"
                    onChange={(e) => onChange({ ...config, area_lights: parseNum(e.target.value) })}
                    className="w-full px-2 py-1.5 rounded border border-gray-200 text-sm text-center text-[#1a1a1a] bg-white focus:border-[#3c5e86] focus:outline-none"
                  />
                </td>
                <td className="py-2 px-3 text-center text-xs text-[#8c8c8c]">
                  {LIGHTING_WATTS.area}W
                </td>
                <td className="py-2 px-3 text-center text-xs text-[#414141]">
                  {(config.area_lights * LIGHTING_WATTS.area / 1000).toFixed(1)}
                </td>
                <td className="py-2 px-3 text-center text-xs text-[#414141]">
                  {(config.area_lights * LIGHTING_WATTS.area / 1000 * config.annual_operating_hours).toLocaleString()}
                </td>
              </tr>
              <tr className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-2 px-3">
                  <span className="text-[#414141]">Roadway Lights</span>
                  <span className="text-[10px] text-[#8c8c8c] block">Internal roads, pathways</span>
                </td>
                <td className="py-2 px-3">
                  <input
                    type="number"
                    min={0}
                    value={config.roadway_lights || ''}
                    placeholder="0"
                    onChange={(e) => onChange({ ...config, roadway_lights: parseNum(e.target.value) })}
                    className="w-full px-2 py-1.5 rounded border border-gray-200 text-sm text-center text-[#1a1a1a] bg-white focus:border-[#3c5e86] focus:outline-none"
                  />
                </td>
                <td className="py-2 px-3 text-center text-xs text-[#8c8c8c]">
                  {LIGHTING_WATTS.roadway}W
                </td>
                <td className="py-2 px-3 text-center text-xs text-[#414141]">
                  {(config.roadway_lights * LIGHTING_WATTS.roadway / 1000).toFixed(1)}
                </td>
                <td className="py-2 px-3 text-center text-xs text-[#414141]">
                  {(config.roadway_lights * LIGHTING_WATTS.roadway / 1000 * config.annual_operating_hours).toLocaleString()}
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr className="bg-[#f5f5f5]">
                <td colSpan={3} className="py-2 px-3 text-right text-[10px] font-semibold text-[#8c8c8c]">
                  Lighting Total ({lightingKw.toFixed(1)} kW):
                </td>
                <td className="py-2 px-3 text-center text-xs font-semibold text-[#414141]">
                  {lightingKw.toFixed(1)}
                </td>
                <td className="py-2 px-3 text-center text-sm font-bold text-[#414141]">
                  {lightingKwh.toLocaleString()} kWh
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Operating hours */}
        <div className="flex items-center gap-4">
          <label className="text-[11px] font-medium text-[#585858]">
            Annual Operating Hours:
          </label>
          <input
            type="number"
            min={0}
            max={8760}
            value={config.annual_operating_hours || ''}
            placeholder="8760"
            onChange={(e) => onChange({ ...config, annual_operating_hours: parseNum(e.target.value, 8760) })}
            className="w-24 px-2 py-1.5 rounded border border-gray-200 text-sm text-center text-[#1a1a1a] bg-white focus:border-[#3c5e86] focus:outline-none"
          />
          <span className="text-[10px] text-[#8c8c8c]">
            (8760 = 24/7 operation, 4380 = 12h/day)
          </span>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-[#f8fafc] rounded-lg border border-gray-200 p-4">
        <div className="flex justify-between items-center">
          <div>
            <div className="text-[10px] font-bold uppercase text-[#8c8c8c]">Total Annual Energy Consumption</div>
            <div className="text-[10px] text-[#8c8c8c] mt-0.5">
              Buildings ({buildingKwh.toLocaleString()} kWh) + Lighting ({lightingKwh.toLocaleString()} kWh)
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
