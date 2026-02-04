'use client'

import { useState } from 'react'
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'

/* ── MMMC palette ── */
const TYPE_COLORS: Record<string, string> = {
  quayside: '#3c5e86',
  yard: '#447a7a',
  horizontal: '#bc8e54',
}

/* ── Types ── */
type EquipmentResult = {
  equipment_key: string
  display_name: string
  equipment_type: string
  unit_label: string
  quantity: number
  unit_capex_usd: number
  total_capex_usd: number
  total_annual_opex_usd: number
  total_annual_energy_cost_usd: number
  total_annual_co2_savings_tons: number
  total_annual_diesel_savings_usd: number
  net_annual_cost_usd: number
  payback_years: number | null
  lifetime_net_savings_usd: number
  lifespan_years: number
}

type EnergyTransitionResponse = {
  success: boolean
  summary: {
    total_investment_usd: number
    total_annual_opex_usd: number
    total_annual_energy_cost_usd: number
    total_annual_co2_savings_tons: number
    total_annual_diesel_savings_usd: number
  }
  equipment: EquipmentResult[]
  inputs: Record<string, number>
}

type PortProfile = {
  port_name: string
  port_location: string
  port_size: string
  terminal_area_ha: number
  quay_length_m: number
  berths: number
  max_draft_m: number
  annual_vessel_calls: number
  ship_types: string[]
  annual_teu: number
  annual_bulk_tonnes: number
  quay_cranes: number
  yard_cranes: number
  terminal_tractors: number
  shore_power_connections: number
  annual_diesel_litres: number
}

type Equipment = {
  key: string
  name: string
  primaryFunction: string
  equipmentType: string
  typeKey: string
  electrificationStatus: string
  challenges: string
}

/* ── Equipment data (from Container Terminal Equipment reference) ── */
const EQUIPMENT: Equipment[] = [
  {
    key: 'sts_crane',
    name: 'Ship-to-Shore Container Crane',
    primaryFunction: 'Ship-to-shore container handling',
    equipmentType: 'Quayside Equipment',
    typeKey: 'quayside',
    electrificationStatus: 'Mature',
    challenges: 'High power requirements',
  },
  {
    key: 'rtg_crane',
    name: 'Rubber Tired Gantry Crane',
    primaryFunction: 'Yard container stacking and transport',
    equipmentType: 'Yard Equipment',
    typeKey: 'yard',
    electrificationStatus: 'Developing',
    challenges: 'Battery technology and charging infrastructure',
  },
  {
    key: 'rmg_crane',
    name: 'Rail Mounted Gantry Crane',
    primaryFunction: 'Automated yard container handling',
    equipmentType: 'Yard Equipment',
    typeKey: 'yard',
    electrificationStatus: 'Mature',
    challenges: 'Cable management complexity',
  },
  {
    key: 'asc',
    name: 'Automated Stacking Crane',
    primaryFunction: 'Fully automated container stacking',
    equipmentType: 'Yard Equipment',
    typeKey: 'yard',
    electrificationStatus: 'Mature',
    challenges: 'High automation integration costs',
  },
  {
    key: 'straddle_carrier',
    name: 'Straddle Carrier',
    primaryFunction: 'Container pickup and stacking',
    equipmentType: 'Yard Equipment',
    typeKey: 'yard',
    electrificationStatus: 'Developing',
    challenges: 'Battery weight and range limitations',
  },
  {
    key: 'agv',
    name: 'Automated Guided Vehicle',
    primaryFunction: 'Automated horizontal container transport',
    equipmentType: 'Horizontal Transport',
    typeKey: 'horizontal',
    electrificationStatus: 'Mature',
    challenges: 'Battery charging coordination',
  },
  {
    key: 'reach_stacker',
    name: 'Reach Stacker',
    primaryFunction: 'Container pickup and short stacking',
    equipmentType: 'Yard Equipment',
    typeKey: 'yard',
    electrificationStatus: 'Developing',
    challenges: 'High lifting loads on battery systems',
  },
  {
    key: 'ech',
    name: 'Empty Container Handler',
    primaryFunction: 'Empty container handling and stacking',
    equipmentType: 'Yard Equipment',
    typeKey: 'yard',
    electrificationStatus: 'Developing',
    challenges: 'Duty cycle demands on batteries',
  },
  {
    key: 'terminal_tractor',
    name: 'Terminal Tractor',
    primaryFunction: 'Container trailer transport',
    equipmentType: 'Horizontal Transport',
    typeKey: 'horizontal',
    electrificationStatus: 'Developing',
    challenges: 'Range and charging downtime',
  },
  {
    key: 'high_bay_storage',
    name: 'Automated High Bay Storage',
    primaryFunction: 'High-density automated storage',
    equipmentType: 'Yard Equipment',
    typeKey: 'yard',
    electrificationStatus: 'Mature',
    challenges: 'High initial capital cost',
  },
  {
    key: 'mobile_harbor_crane',
    name: 'Mobile Harbor Crane',
    primaryFunction: 'Versatile ship-to-shore and yard operations',
    equipmentType: 'Quayside Equipment',
    typeKey: 'quayside',
    electrificationStatus: 'Developing',
    challenges: 'Hybrid drivetrain complexity',
  },
  {
    key: 'portal_crane',
    name: 'Portal Crane',
    primaryFunction: 'Fixed-position cargo handling and container operations',
    equipmentType: 'Quayside Equipment',
    typeKey: 'quayside',
    electrificationStatus: 'Mature',
    challenges: 'Grid connection capacity',
  },
]

/* ── Static data ── */
const PORT_SIZES = [
  { value: '', label: 'Select size...' },
  { value: 'small_feeder', label: 'Small Feeder (< 500K TEU)' },
  { value: 'regional', label: 'Regional (500K \u2013 2M TEU)' },
  { value: 'hub', label: 'Hub (2M \u2013 10M TEU)' },
  { value: 'mega_hub', label: 'Mega Hub (> 10M TEU)' },
]

const SHIP_TYPES = [
  'Container', 'Bulk Carrier', 'Tanker', 'LNG Carrier',
  'RoRo', 'Cruise', 'General Cargo', 'Offshore / Supply',
]

const INITIAL_PORT: PortProfile = {
  port_name: '', port_location: '', port_size: '',
  terminal_area_ha: 0, quay_length_m: 0, berths: 0, max_draft_m: 0,
  annual_vessel_calls: 0, ship_types: [], annual_teu: 0, annual_bulk_tonnes: 0,
  quay_cranes: 0, yard_cranes: 0, terminal_tractors: 0, shore_power_connections: 0,
  annual_diesel_litres: 0,
}

/* ── Shared styles ── */
const inputBase = 'w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-[#414141] bg-white focus:border-[#68a4c2] focus:ring-2 focus:ring-[#d4eefa] focus:outline-none transition-all'
const labelBase = 'block text-xs font-medium text-[#585858] mb-1'
const sectionHeading = 'text-[11px] font-bold uppercase tracking-widest text-[#8c8c8c] mb-4'

const ELECTRIFIED_STYLE: Record<string, string> = {
  Yes: 'bg-[#dcf0d6] text-[#286464]',
  No: 'bg-[#fae0da] text-[#9e5858]',
}

/* ════════════════════════════════════════════════════════════════ */

export default function EnergyTransitionPage() {
  /* ── Port profile state ── */
  const [port, setPort] = useState<PortProfile>(INITIAL_PORT)

  const updatePort = <K extends keyof PortProfile>(key: K, value: PortProfile[K]) =>
    setPort(prev => ({ ...prev, [key]: value }))

  const updatePortNumber = (key: keyof PortProfile, raw: string) =>
    updatePort(key, Math.max(0, parseFloat(raw) || 0) as PortProfile[typeof key])

  const toggleShipType = (type: string) =>
    setPort(prev => ({
      ...prev,
      ship_types: prev.ship_types.includes(type)
        ? prev.ship_types.filter(t => t !== type)
        : [...prev.ship_types, type],
    }))

  /* ── Equipment quantities state ── */
  const [eqQuantities, setEqQuantities] = useState<Record<string, number>>(
    () => Object.fromEntries(EQUIPMENT.map(eq => [eq.key, 0]))
  )

  const setEqQty = (key: string, raw: string) =>
    setEqQuantities(prev => ({ ...prev, [key]: Math.max(0, parseInt(raw) || 0) }))

  /* ── Already electrified state (default: No for all) ── */
  const [eqElectrified, setEqElectrified] = useState<Record<string, boolean>>(
    () => Object.fromEntries(EQUIPMENT.map(eq => [eq.key, false]))
  )

  const toggleElectrified = (key: string) =>
    setEqElectrified(prev => ({ ...prev, [key]: !prev[key] }))

  /* ── Results state ── */
  const [result, setResult] = useState<EnergyTransitionResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCalculate = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/energy-transition/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantities: eqQuantities })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Calculation failed')
        setResult(null)
      } else {
        setResult(data)
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred')
      setResult(null)
    }

    setLoading(false)
  }

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency', currency: 'USD',
      minimumFractionDigits: 0, maximumFractionDigits: 0,
    }).format(value)

  const formatNumber = (value: number, decimals = 0) =>
    new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals, maximumFractionDigits: decimals,
    }).format(value)

  const hasInput = Object.values(eqQuantities).some(q => q > 0)

  /* ── Render helpers ── */
  const numericField = (
    label: string, portKey: keyof PortProfile, unit?: string, step?: string,
  ) => (
    <div>
      <label className={labelBase}>{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="number" min="0" step={step}
          value={(port[portKey] as number) || ''}
          onChange={e => updatePortNumber(portKey, e.target.value)}
          className={inputBase}
        />
        {unit && <span className="text-xs text-[#8c8c8c] whitespace-nowrap">{unit}</span>}
      </div>
    </div>
  )

  /* ──────────────────────────── JSX ──────────────────────────── */
  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <div className="py-14" style={{ backgroundColor: '#e8f8fc' }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8 text-center">
          <h1 className="text-4xl font-extralight text-[#414141] mb-3 tracking-tight">
            Port Energy Transition Tool
          </h1>
          <p className="text-sm font-light text-[#585858] max-w-2xl mx-auto">
            Evaluate capital investment, operating costs, and CO2 savings for port decarbonization infrastructure
          </p>
        </div>
      </div>

      <div className="py-10" style={{ backgroundColor: '#f2f2f2' }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8 space-y-8">

          {/* ═══════════════════════════════════════════
              SECTION 1 — Port Definition
             ═══════════════════════════════════════════ */}
          <div className="bg-white rounded-2xl p-8 border border-[#dcdcdc]">
            <div className="flex items-center mb-8">
              <div className="w-1 h-8 rounded-full mr-3" style={{ backgroundColor: '#3c5e86' }}></div>
              <h2 className="text-xl font-light text-[#414141]">Port Definition</h2>
            </div>

            <p className={sectionHeading}>Identity</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
              <div>
                <label className={labelBase}>Port Name</label>
                <input type="text" value={port.port_name}
                  onChange={e => updatePort('port_name', e.target.value)}
                  placeholder="e.g. Port of Rotterdam" className={inputBase} />
              </div>
              <div>
                <label className={labelBase}>Location / Country</label>
                <input type="text" value={port.port_location}
                  onChange={e => updatePort('port_location', e.target.value)}
                  placeholder="e.g. Netherlands" className={inputBase} />
              </div>
              <div>
                <label className={labelBase}>Port Size Classification</label>
                <select value={port.port_size}
                  onChange={e => updatePort('port_size', e.target.value)} className={inputBase}>
                  {PORT_SIZES.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <p className={sectionHeading}>Terminal Dimensions</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-8">
              {numericField('Terminal Area', 'terminal_area_ha', 'ha')}
              {numericField('Total Quay Length', 'quay_length_m', 'm')}
              {numericField('Number of Berths / Jetties', 'berths')}
              {numericField('Max Vessel Draft', 'max_draft_m', 'm', '0.1')}
            </div>

            <p className={sectionHeading}>Vessel Traffic</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-5">
              {numericField('Annual Vessel Calls', 'annual_vessel_calls')}
              {numericField('Annual TEU Throughput', 'annual_teu', 'TEU')}
              {numericField('Annual Bulk Cargo', 'annual_bulk_tonnes', 'kt')}
            </div>
            <div className="mb-8">
              <label className={labelBase}>Ship Types Served</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {SHIP_TYPES.map(type => {
                  const active = port.ship_types.includes(type)
                  return (
                    <button key={type} type="button" onClick={() => toggleShipType(type)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                        active
                          ? 'bg-[#3c5e86] text-white border-[#3c5e86]'
                          : 'bg-white text-[#585858] border-[#dcdcdc] hover:border-[#8c8c8c]'
                      }`}>
                      {type}
                    </button>
                  )
                })}
              </div>
            </div>

            <p className={sectionHeading}>Existing Equipment</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-8">
              {numericField('Quay Cranes (STS)', 'quay_cranes')}
              {numericField('Yard Cranes (RTG / RMG)', 'yard_cranes')}
              {numericField('Terminal Tractors', 'terminal_tractors')}
              {numericField('Shore Power Connections', 'shore_power_connections')}
            </div>

            <p className={sectionHeading}>Energy Baseline</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
              {numericField('Annual Diesel Consumption', 'annual_diesel_litres', 'litres')}
            </div>
          </div>

          {/* ═══════════════════════════════════════════
              SECTION 2 — Container Terminal Equipment
             ═══════════════════════════════════════════ */}
          <div className="bg-white rounded-2xl p-8 border border-[#dcdcdc]">
            <div className="flex items-center mb-2">
              <div className="w-1 h-8 rounded-full mr-3" style={{ backgroundColor: '#447a7a' }}></div>
              <h2 className="text-xl font-light text-[#414141]">Container Terminal Equipment</h2>
            </div>
            <p className="text-xs text-[#8c8c8c] mb-8 ml-[19px]">
              Specify the number of units to electrify or convert for each equipment type
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {EQUIPMENT.map(eq => {
                const typeColor = TYPE_COLORS[eq.typeKey]
                return (
                  <div key={eq.key} className="bg-white rounded-xl border border-[#dcdcdc] overflow-hidden flex flex-col">
                    {/* Color accent bar */}
                    <div className="h-1.5" style={{ backgroundColor: typeColor }}></div>

                    <div className="p-4 flex-1 flex flex-col">
                      {/* Header */}
                      <p className="text-[10px] uppercase tracking-widest text-[#8c8c8c] mb-1">Equipment</p>
                      <h3 className="text-sm font-medium text-[#414141] mb-3 leading-tight">{eq.name}</h3>

                      {/* Metadata */}
                      <div className="space-y-2.5 text-xs flex-1">
                        <div>
                          <span className="text-[#8c8c8c]">Primary Function</span>
                          <p className="text-[#585858] leading-snug">{eq.primaryFunction}</p>
                        </div>
                        <div>
                          <span className="text-[#8c8c8c]">Equipment Type</span>
                          <p className="text-[#585858]">{eq.equipmentType}</p>
                        </div>
                        <div>
                          <span className="text-[#8c8c8c]">Already Electrified</span>
                          <div className="flex gap-1.5 mt-1">
                            {(['No', 'Yes'] as const).map(option => {
                              const isActive = option === 'Yes' ? eqElectrified[eq.key] : !eqElectrified[eq.key]
                              return (
                                <button
                                  key={option}
                                  type="button"
                                  onClick={() => toggleElectrified(eq.key)}
                                  className={`px-3 py-0.5 rounded text-[10px] font-medium transition-all ${
                                    isActive
                                      ? ELECTRIFIED_STYLE[option]
                                      : 'bg-[#f2f2f2] text-[#bebebe]'
                                  }`}
                                >
                                  {option}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                        <div>
                          <span className="text-[#8c8c8c]">Electrification Status</span>
                          <p className="text-[#585858]">{eq.electrificationStatus}</p>
                        </div>
                        <div>
                          <span className="text-[#8c8c8c]">Electrification Challenges</span>
                          <p className="text-[#585858] leading-snug">{eq.challenges}</p>
                        </div>
                      </div>

                      {/* Quantity input */}
                      <div className="mt-4 pt-3 border-t border-[#f2f2f2]">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-[#8c8c8c] mb-1.5 block">
                          Units to Electrify
                        </label>
                        <input
                          type="number" min="0"
                          value={eqQuantities[eq.key] || ''}
                          onChange={e => setEqQty(eq.key, e.target.value)}
                          className={inputBase}
                          placeholder="0"
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Calculate button */}
            <div className="mt-8 flex justify-center">
              <button
                onClick={handleCalculate}
                disabled={loading || !hasInput}
                className="text-white font-medium text-sm py-3 px-12 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ backgroundColor: '#3c5e86' }}
                onMouseEnter={e => { if (!loading && hasInput) (e.target as HTMLElement).style.backgroundColor = '#2e4a6a' }}
                onMouseLeave={e => (e.target as HTMLElement).style.backgroundColor = '#3c5e86'}
              >
                {loading ? 'Calculating...' : 'Calculate Investment'}
              </button>
            </div>
          </div>

          {/* ═══════════════════════════════════════════
              SECTION 3 — Results
             ═══════════════════════════════════════════ */}
          {error && (
            <div className="rounded-2xl text-[#9e5858] px-5 py-4 text-sm border" style={{ backgroundColor: '#feeeea', borderColor: '#fac8c2' }}>
              <p className="font-medium">{error}</p>
            </div>
          )}

          {!result && !error && hasInput && (
            <div className="bg-white rounded-2xl p-12 border border-[#dcdcdc] text-center">
              <div className="text-[#bebebe] text-5xl mb-4">&#9889;</div>
              <p className="text-sm text-[#8c8c8c]">Click Calculate to see your investment analysis</p>
            </div>
          )}

          {result && (
            <div className="space-y-6">
              {/* Summary Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-2xl p-5 border" style={{ backgroundColor: '#dcf0d6', borderColor: '#b8e0c2' }}>
                  <div className="text-2xl font-extralight mb-1 text-[#414141]">
                    {formatCurrency(result.summary.total_investment_usd)}
                  </div>
                  <div className="text-[10px] font-bold text-[#585858] uppercase tracking-widest">Total Investment</div>
                  <div className="text-xs text-[#8c8c8c] mt-1">CAPEX required</div>
                </div>

                <div className="rounded-2xl p-5 border" style={{ backgroundColor: '#d4eefa', borderColor: '#b8e4f4' }}>
                  <div className="text-2xl font-extralight mb-1 text-[#414141]">
                    {formatNumber(result.summary.total_annual_co2_savings_tons)} t
                  </div>
                  <div className="text-[10px] font-bold text-[#585858] uppercase tracking-widest">Annual CO2 Savings</div>
                  <div className="text-xs text-[#8c8c8c] mt-1">tons CO2e/year</div>
                </div>

                <div className="rounded-2xl p-5 border" style={{ backgroundColor: '#fceec8', borderColor: '#fae6aa' }}>
                  <div className="text-2xl font-extralight mb-1 text-[#414141]">
                    {formatCurrency(result.summary.total_annual_diesel_savings_usd)}
                  </div>
                  <div className="text-[10px] font-bold text-[#585858] uppercase tracking-widest">Annual Diesel Savings</div>
                  <div className="text-xs text-[#8c8c8c] mt-1">fuel cost avoided/year</div>
                </div>

                <div className="rounded-2xl p-5 border" style={{ backgroundColor: '#f2f2f2', borderColor: '#dcdcdc' }}>
                  <div className="text-2xl font-extralight mb-1 text-[#414141]">
                    {formatCurrency(result.summary.total_annual_opex_usd + result.summary.total_annual_energy_cost_usd)}
                  </div>
                  <div className="text-[10px] font-bold text-[#585858] uppercase tracking-widest">Annual Operating Cost</div>
                  <div className="text-xs text-[#8c8c8c] mt-1">OPEX + energy</div>
                </div>
              </div>

              {/* Cost Breakdown Table */}
              <div className="bg-white rounded-2xl p-6 border border-[#dcdcdc]">
                <div className="flex items-center mb-5">
                  <div className="w-1 h-8 rounded-full mr-3" style={{ backgroundColor: '#447a7a' }}></div>
                  <h3 className="text-xl font-light text-[#414141]">Cost Breakdown</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b-2 border-[#dcdcdc]" style={{ backgroundColor: '#f2f2f2' }}>
                        <th className="px-3 py-3 text-left text-xs font-medium text-[#585858]">Equipment</th>
                        <th className="px-3 py-3 text-right text-xs font-medium text-[#585858]">Qty</th>
                        <th className="px-3 py-3 text-right text-xs font-medium text-[#585858]">CAPEX</th>
                        <th className="px-3 py-3 text-right text-xs font-medium text-[#585858]">Annual OPEX</th>
                        <th className="px-3 py-3 text-right text-xs font-medium text-[#585858]">Energy Cost</th>
                        <th className="px-3 py-3 text-right text-xs font-medium text-[#585858]">Diesel Savings</th>
                        <th className="px-3 py-3 text-right text-xs font-medium text-[#585858]">Payback</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.equipment.map((eq: EquipmentResult, idx: number) => (
                        <tr key={eq.equipment_key} className={`border-b border-[#f2f2f2] ${idx % 2 !== 0 ? 'bg-[#f2f2f2]/40' : ''}`}>
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-full"
                                style={{ backgroundColor: TYPE_COLORS[eq.equipment_type] }}></div>
                              <span className="font-medium text-[#414141]">{eq.display_name}</span>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-right text-[#585858]">
                            {eq.quantity} {eq.unit_label}{eq.quantity !== 1 ? 's' : ''}
                          </td>
                          <td className="px-3 py-3 text-right font-medium text-[#414141]">{formatCurrency(eq.total_capex_usd)}</td>
                          <td className="px-3 py-3 text-right text-[#585858]">{formatCurrency(eq.total_annual_opex_usd)}/yr</td>
                          <td className="px-3 py-3 text-right text-[#585858]">{formatCurrency(eq.total_annual_energy_cost_usd)}/yr</td>
                          <td className="px-3 py-3 text-right text-[#447a7a]">{formatCurrency(eq.total_annual_diesel_savings_usd)}/yr</td>
                          <td className="px-3 py-3 text-right text-[#585858]">
                            {eq.payback_years !== null ? `${eq.payback_years.toFixed(1)} yrs` : 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-[#bebebe]" style={{ backgroundColor: '#f2f2f2' }}>
                        <td className="px-3 py-3 font-medium text-[#414141]">Total</td>
                        <td className="px-3 py-3"></td>
                        <td className="px-3 py-3 text-right font-bold text-[#414141]">{formatCurrency(result.summary.total_investment_usd)}</td>
                        <td className="px-3 py-3 text-right font-medium text-[#585858]">{formatCurrency(result.summary.total_annual_opex_usd)}/yr</td>
                        <td className="px-3 py-3 text-right font-medium text-[#585858]">{formatCurrency(result.summary.total_annual_energy_cost_usd)}/yr</td>
                        <td className="px-3 py-3 text-right font-medium text-[#447a7a]">{formatCurrency(result.summary.total_annual_diesel_savings_usd)}/yr</td>
                        <td className="px-3 py-3"></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl p-6 border border-[#dcdcdc]">
                  <div className="flex items-center mb-4">
                    <div className="w-1 h-6 rounded-full mr-3" style={{ backgroundColor: '#9e5858' }}></div>
                    <h3 className="text-sm font-medium text-[#585858]">Capital Investment by Equipment</h3>
                  </div>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={result.equipment} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#dcdcdc" />
                      <XAxis dataKey="display_name" stroke="#8c8c8c"
                        style={{ fontSize: '9px', fontWeight: 300 }}
                        tickFormatter={(v: string) => {
                          const w = v.split(' ')
                          return w.length > 2 ? w.slice(0, 2).join(' ') + '...' : v
                        }} />
                      <YAxis stroke="#8c8c8c" style={{ fontSize: '10px', fontWeight: 300 }}
                        tickFormatter={(v: number) =>
                          v >= 1000000 ? `$${(v / 1000000).toFixed(0)}M` : `$${(v / 1000).toFixed(0)}K`
                        } />
                      <Tooltip formatter={(v: any) => formatCurrency(v)}
                        contentStyle={{ backgroundColor: '#414141', border: 'none', borderRadius: '0', color: 'white', fontWeight: 300, fontSize: '11px' }} />
                      <Bar dataKey="total_capex_usd" name="CAPEX" radius={[4, 4, 0, 0]}>
                        {result.equipment.map((eq: EquipmentResult) => (
                          <Cell key={eq.equipment_key} fill={TYPE_COLORS[eq.equipment_type]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-[#dcdcdc]">
                  <div className="flex items-center mb-4">
                    <div className="w-1 h-6 rounded-full mr-3" style={{ backgroundColor: '#3c5e86' }}></div>
                    <h3 className="text-sm font-medium text-[#585858]">Investment Share</h3>
                  </div>
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie data={result.equipment} dataKey="total_capex_usd" nameKey="display_name"
                        cx="50%" cy="50%" outerRadius={90} innerRadius={45} paddingAngle={2}
                        label={({ display_name, percent }: any) => {
                          const w = display_name.split(' ')
                          const s = w.length > 2 ? w.slice(0, 2).join(' ') : display_name
                          return `${s} ${(percent * 100).toFixed(0)}%`
                        }}
                        style={{ fontSize: '10px', fontWeight: 300 }}>
                        {result.equipment.map((eq: EquipmentResult) => (
                          <Cell key={eq.equipment_key} fill={TYPE_COLORS[eq.equipment_type]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: any) => formatCurrency(v)}
                        contentStyle={{ backgroundColor: '#414141', border: 'none', borderRadius: '0', color: 'white', fontWeight: 300, fontSize: '11px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="text-center mt-2">
                    <div className="text-lg font-extralight text-[#414141]">{formatCurrency(result.summary.total_investment_usd)}</div>
                    <div className="text-xs text-[#8c8c8c]">Total Investment</div>
                  </div>
                </div>
              </div>

              {/* Lifetime Savings */}
              <div className="bg-white rounded-2xl p-6 border border-[#dcdcdc]">
                <div className="flex items-center mb-4">
                  <div className="w-1 h-6 rounded-full mr-3" style={{ backgroundColor: '#447a7a' }}></div>
                  <h3 className="text-sm font-medium text-[#585858]">Lifetime Net Savings</h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {result.equipment.map((eq: EquipmentResult) => (
                    <div key={eq.equipment_key} className="rounded-lg p-3 border border-[#dcdcdc] text-center" style={{ backgroundColor: '#f2f2f2' }}>
                      <div className="w-3 h-3 rounded-full mx-auto mb-2"
                        style={{ backgroundColor: TYPE_COLORS[eq.equipment_type] }}></div>
                      <div className="text-xs text-[#585858] mb-1 font-medium">{eq.display_name}</div>
                      <div className={`text-sm font-medium ${eq.lifetime_net_savings_usd >= 0 ? 'text-[#447a7a]' : 'text-[#9e5858]'}`}>
                        {formatCurrency(eq.lifetime_net_savings_usd)}
                      </div>
                      <div className="text-xs text-[#8c8c8c] mt-1">over {eq.lifespan_years} years</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
