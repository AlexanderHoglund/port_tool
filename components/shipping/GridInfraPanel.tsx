'use client'

type Props = {
  cableLengthM: number
  onCableLengthChange: (length: number) => void
  // Preview calculations (estimated from equipment/chargers/OPS)
  equipmentPeakKw: number
  chargerPeakKw: number
  opsPeakMw: number
}

export default function GridInfraPanel({
  cableLengthM,
  onCableLengthChange,
  equipmentPeakKw,
  chargerPeakKw,
  opsPeakMw,
}: Props) {
  const simultaneityFactor = 0.8
  const grossPeakMw = (equipmentPeakKw + chargerPeakKw) / 1000 + opsPeakMw
  const netPeakMw = grossPeakMw * simultaneityFactor

  // Estimate substation type and cost
  let substationType = '11kV'
  let substationCostPerMw = 200000
  if (netPeakMw > 30) {
    substationType = '110kV'
    substationCostPerMw = 240000
  } else if (netPeakMw > 10) {
    substationType = '33kV'
    substationCostPerMw = 230000
  }
  const substationCapex = substationCostPerMw * netPeakMw

  // Estimate cable type and cost
  let cableType = '11kV 3-core'
  let cableCostPerMeter = 90
  if (netPeakMw > 20) {
    cableType = '33kV 3×1-core'
    cableCostPerMeter = 150
  }
  const cableCapex = cableCostPerMeter * cableLengthM

  const totalGridCapex = substationCapex + cableCapex

  return (
    <div className="space-y-4">
      {/* Cable length input */}
      <div className="space-y-2">
        <label className="block text-[10px] font-bold uppercase tracking-wide text-[#8c8c8c]">
          Cable Run Length (meters)
        </label>
        <input
          type="number"
          min={0}
          step={100}
          value={cableLengthM || ''}
          onChange={(e) => onCableLengthChange(parseInt(e.target.value) || 0)}
          placeholder="500"
          className="w-40 px-3 py-2 rounded-lg border border-gray-200 text-sm text-[#1a1a1a] bg-white focus:border-[#3c5e86] focus:ring-1 focus:ring-[#3c5e86] focus:outline-none"
        />
        <p className="text-[10px] text-[#8c8c8c]">
          Total cable length from grid connection point to equipment. Default: 500m.
        </p>
      </div>

      {/* Peak demand summary */}
      <div className="bg-[#fafafa] rounded-lg p-4 space-y-3">
        <h4 className="text-[11px] font-bold uppercase tracking-wide text-[#8c8c8c]">
          Peak Demand Estimate
        </h4>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-[#8c8c8c]">Equipment:</span>
            <span className="float-right text-[#414141]">{(equipmentPeakKw / 1000).toFixed(2)} MW</span>
          </div>
          <div>
            <span className="text-[#8c8c8c]">Chargers:</span>
            <span className="float-right text-[#414141]">{(chargerPeakKw / 1000).toFixed(2)} MW</span>
          </div>
          <div>
            <span className="text-[#8c8c8c]">Shore Power (OPS):</span>
            <span className="float-right text-[#414141]">{opsPeakMw.toFixed(2)} MW</span>
          </div>
          <div>
            <span className="text-[#8c8c8c]">Gross Total:</span>
            <span className="float-right text-[#414141] font-semibold">{grossPeakMw.toFixed(2)} MW</span>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-3 flex justify-between text-sm">
          <span className="text-[#585858]">Simultaneity Factor:</span>
          <span className="text-[#414141]">{(simultaneityFactor * 100).toFixed(0)}%</span>
        </div>
        <div className="flex justify-between text-sm font-semibold">
          <span className="text-[#3c5e86]">Net Peak Demand:</span>
          <span className="text-[#3c5e86]">{netPeakMw.toFixed(2)} MW</span>
        </div>
      </div>

      {/* Infrastructure estimate */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
        <h4 className="text-[11px] font-bold uppercase tracking-wide text-[#8c8c8c]">
          Infrastructure Estimate
        </h4>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-[#585858]">Substation ({substationType}):</span>
            <span className="text-[#414141]">${(substationCapex / 1000000).toFixed(2)}M</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#585858]">Cabling ({cableType}, {cableLengthM.toLocaleString()}m):</span>
            <span className="text-[#414141]">${(cableCapex / 1000).toFixed(0)}K</span>
          </div>
          <div className="border-t border-gray-200 pt-2 flex justify-between font-semibold">
            <span className="text-[#3c5e86]">Total Grid CAPEX:</span>
            <span className="text-[#3c5e86]">${(totalGridCapex / 1000000).toFixed(2)}M</span>
          </div>
        </div>
      </div>

      <div className="text-[10px] text-[#8c8c8c] space-y-1">
        <p><strong>Simultaneity Factor</strong>: Accounts for non-concurrent equipment operation (80% default)</p>
        <p><strong>Substation sizing</strong>: Automatically selected based on peak demand (11kV/33kV/110kV)</p>
      </div>
    </div>
  )
}
