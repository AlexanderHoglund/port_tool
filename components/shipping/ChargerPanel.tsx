'use client'

// EVSE charger configuration from PIECE data
const EVSE_CONFIG = [
  { evse_key: 'evse_agv', equipment_key: 'agv', display_name: 'AGV Charger', power_kw: 200, units_per_charger: 15, capex_usd: 110000 },
  { evse_key: 'evse_tt', equipment_key: 'tt', display_name: 'Terminal Tractor Charger', power_kw: 440, units_per_charger: 15, capex_usd: 210000 },
  { evse_key: 'evse_ech', equipment_key: 'ech', display_name: 'ECH Charger', power_kw: 220, units_per_charger: 5, capex_usd: 120000 },
  { evse_key: 'evse_rs', equipment_key: 'rs', display_name: 'Reach Stacker Charger', power_kw: 840, units_per_charger: 9, capex_usd: 400000 },
  { evse_key: 'evse_sc', equipment_key: 'sc', display_name: 'Straddle Carrier Charger', power_kw: 360, units_per_charger: 9, capex_usd: 180000 },
]

type Props = {
  scenarioEquipment: Record<string, number>
  chargerOverrides?: Record<string, number>
  onChange: (overrides: Record<string, number>) => void
}

export default function ChargerPanel({ scenarioEquipment, chargerOverrides, onChange }: Props) {
  // Calculate required chargers
  const chargerData = EVSE_CONFIG.map((evse) => {
    const equipmentCount = scenarioEquipment[evse.equipment_key] ?? 0
    const calculated = equipmentCount > 0 ? Math.ceil(equipmentCount / evse.units_per_charger) : 0
    const override = chargerOverrides?.[evse.evse_key]
    const final = override ?? calculated
    const totalCapex = final * evse.capex_usd
    const totalPower = final * evse.power_kw

    return {
      ...evse,
      equipmentCount,
      calculated,
      override,
      final,
      totalCapex,
      totalPower,
    }
  }).filter((c) => c.equipmentCount > 0 || c.override !== undefined)

  const totals = chargerData.reduce(
    (acc, c) => ({
      chargers: acc.chargers + c.final,
      power: acc.power + c.totalPower,
      capex: acc.capex + c.totalCapex,
    }),
    { chargers: 0, power: 0, capex: 0 }
  )

  function updateOverride(evseKey: string, value: number | undefined) {
    const newOverrides = { ...chargerOverrides }
    if (value === undefined) {
      delete newOverrides[evseKey]
    } else {
      newOverrides[evseKey] = value
    }
    onChange(newOverrides)
  }

  if (chargerData.length === 0) {
    return (
      <div className="text-sm text-[#8c8c8c] text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-200">
        No battery-powered equipment configured. Add AGVs, Terminal Tractors, ECHs, Reach Stackers, or Straddle Carriers to see charger requirements.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-2 px-3 text-[10px] font-bold uppercase text-[#8c8c8c]">Charger Type</th>
              <th className="text-center py-2 px-3 text-[10px] font-bold uppercase text-[#8c8c8c]">Equipment</th>
              <th className="text-center py-2 px-3 text-[10px] font-bold uppercase text-[#8c8c8c]">Sharing</th>
              <th className="text-center py-2 px-3 text-[10px] font-bold uppercase text-[#8c8c8c]">Calculated</th>
              <th className="text-center py-2 px-3 text-[10px] font-bold uppercase text-[#8c8c8c]">Override</th>
              <th className="text-center py-2 px-3 text-[10px] font-bold uppercase text-[#8c8c8c]">Final</th>
              <th className="text-right py-2 px-3 text-[10px] font-bold uppercase text-[#8c8c8c]">Power (kW)</th>
              <th className="text-right py-2 px-3 text-[10px] font-bold uppercase text-[#8c8c8c]">CAPEX</th>
            </tr>
          </thead>
          <tbody>
            {chargerData.map((c) => (
              <tr key={c.evse_key} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-2 px-3 text-[#414141]">{c.display_name}</td>
                <td className="py-2 px-3 text-center text-[#585858]">{c.equipmentCount}</td>
                <td className="py-2 px-3 text-center text-[#8c8c8c]">{c.units_per_charger}:1</td>
                <td className="py-2 px-3 text-center text-[#8c8c8c]">{c.calculated}</td>
                <td className="py-2 px-3">
                  <input
                    type="number"
                    min={0}
                    value={c.override ?? ''}
                    placeholder={String(c.calculated)}
                    onChange={(e) => {
                      const val = e.target.value
                      if (val === '') {
                        updateOverride(c.evse_key, undefined)
                      } else {
                        updateOverride(c.evse_key, parseInt(val) || 0)
                      }
                    }}
                    className="w-16 px-2 py-1 rounded border border-gray-200 text-sm text-center text-[#1a1a1a] bg-white focus:border-[#3c5e86] focus:ring-1 focus:ring-[#3c5e86] focus:outline-none"
                  />
                </td>
                <td className="py-2 px-3 text-center font-semibold text-[#3c5e86]">{c.final}</td>
                <td className="py-2 px-3 text-right text-[#585858]">{(c.totalPower).toLocaleString()}</td>
                <td className="py-2 px-3 text-right text-[#585858]">${(c.totalCapex / 1000).toFixed(0)}K</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-[#fafafa] font-semibold">
              <td colSpan={5} className="py-2 px-3 text-right text-[#414141]">Totals:</td>
              <td className="py-2 px-3 text-center text-[#3c5e86]">{totals.chargers}</td>
              <td className="py-2 px-3 text-right text-[#414141]">{totals.power.toLocaleString()}</td>
              <td className="py-2 px-3 text-right text-[#414141]">${(totals.capex / 1000000).toFixed(2)}M</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="text-[10px] text-[#8c8c8c] space-y-1">
        <p><strong>Sharing</strong> = Units per charger (e.g., 15:1 means 15 AGVs share 1 charger)</p>
        <p><strong>Override</strong> = Leave blank to use calculated value, or enter custom charger count</p>
      </div>
    </div>
  )
}
