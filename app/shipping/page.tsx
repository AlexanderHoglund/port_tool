'use client'

import { useState } from 'react'
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'

const CATEGORY_COLORS: Record<string, string> = {
  electric_tractor: '#7AB893',
  ammonia_bunkering: '#6B9BD2',
  shore_power: '#C19A6B',
  crane_electrification: '#9B8EC4',
}

type CategoryResult = {
  category_key: string
  display_name: string
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
  categories: CategoryResult[]
  inputs: Record<string, number>
}

const CATEGORIES = [
  { key: 'electric_tractor', label: 'Electric Terminal Tractors', hint: 'Battery-electric yard tractors replacing diesel units', color: 'green', unitLabel: 'tractors' },
  { key: 'ammonia_bunkering', label: 'Ammonia Bunkering Facilities', hint: 'Shore-side ammonia storage and bunkering infrastructure', color: 'blue', unitLabel: 'facilities' },
  { key: 'shore_power', label: 'Onshore Power Supply (OPS)', hint: 'Shore-to-ship power connections per berth', color: 'yellow', unitLabel: 'berths' },
  { key: 'crane_electrification', label: 'Crane Electrification', hint: 'Diesel RTG to electric eRTG conversions', color: 'purple', unitLabel: 'cranes' },
]

const colorClasses: Record<string, { bg: string; border: string; focus: string }> = {
  green: { bg: 'bg-green-50', border: 'border-green-100', focus: 'focus:border-green-400 focus:ring-green-100' },
  blue: { bg: 'bg-blue-50', border: 'border-blue-100', focus: 'focus:border-blue-400 focus:ring-blue-100' },
  yellow: { bg: 'bg-yellow-50', border: 'border-yellow-100', focus: 'focus:border-yellow-400 focus:ring-yellow-100' },
  purple: { bg: 'bg-purple-50', border: 'border-purple-100', focus: 'focus:border-purple-400 focus:ring-purple-100' },
}

export default function EnergyTransitionPage() {
  const [quantities, setQuantities] = useState<Record<string, number>>({
    electric_tractor: 0,
    ammonia_bunkering: 0,
    shore_power: 0,
    crane_electrification: 0,
  })

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
        body: JSON.stringify({ quantities })
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
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)

  const formatNumber = (value: number, decimals = 0) =>
    new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value)

  const hasInput = Object.values(quantities).some(q => q > 0)

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 py-12">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-light text-gray-800 mb-3">
              Port Energy Transition Tool
            </h1>
            <p className="text-sm text-gray-600 font-light max-w-2xl mx-auto">
              Evaluate capital investment, operating costs, and CO2 savings for port decarbonization infrastructure
            </p>
          </div>
        </div>
      </div>

      {/* Split Screen Layout */}
      <div className="bg-gray-50 min-h-screen py-8">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

            {/* LEFT PANEL — Input Form */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 sticky top-8">
                <div className="flex items-center mb-6">
                  <div className="w-1 h-8 bg-blue-500 rounded-full mr-3"></div>
                  <h2 className="text-xl font-medium text-gray-800">
                    Investment Categories
                  </h2>
                </div>

                <div className="space-y-4">
                  {CATEGORIES.map(cat => {
                    const colors = colorClasses[cat.color]
                    return (
                      <div key={cat.key} className={`${colors.bg} rounded-xl p-4 border ${colors.border}`}>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {cat.label}
                        </label>
                        <p className="text-xs text-gray-400 mb-2">{cat.hint}</p>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            value={quantities[cat.key]}
                            onChange={(e) =>
                              setQuantities({
                                ...quantities,
                                [cat.key]: Math.max(0, parseInt(e.target.value) || 0),
                              })
                            }
                            className={`w-full px-3 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm ${colors.focus} focus:ring-2 focus:outline-none transition-all bg-white`}
                          />
                          <span className="text-xs text-gray-500 whitespace-nowrap">{cat.unitLabel}</span>
                        </div>
                      </div>
                    )
                  })}

                  <button
                    onClick={handleCalculate}
                    disabled={loading || !hasInput}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm py-3 px-6 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                  >
                    {loading ? 'Calculating...' : 'Calculate Investment'}
                  </button>
                </div>
              </div>
            </div>

            {/* RIGHT PANEL — Results */}
            <div className="lg:col-span-3">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-2xl text-red-700 px-5 py-4 mb-6 text-sm">
                  <p className="font-medium">{error}</p>
                </div>
              )}

              {!result && !error && (
                <div className="bg-white rounded-2xl p-12 shadow-sm border border-gray-200 text-center">
                  <div className="text-gray-300 text-6xl mb-4">&#9889;</div>
                  <h3 className="text-lg font-medium text-gray-400 mb-2">No results yet</h3>
                  <p className="text-sm text-gray-400">Enter quantities on the left and click Calculate to see your investment analysis.</p>
                </div>
              )}

              {result && (
                <div className="space-y-6">
                  {/* Summary Stats */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-green-100 rounded-2xl p-5 border border-green-200">
                      <div className="text-2xl font-light mb-1 text-gray-800">
                        {formatCurrency(result.summary.total_investment_usd)}
                      </div>
                      <div className="text-xs font-medium text-gray-600 uppercase tracking-wide">Total Investment</div>
                      <div className="text-xs text-gray-500 mt-1">CAPEX required</div>
                    </div>

                    <div className="bg-blue-100 rounded-2xl p-5 border border-blue-200">
                      <div className="text-2xl font-light mb-1 text-gray-800">
                        {formatNumber(result.summary.total_annual_co2_savings_tons)} t
                      </div>
                      <div className="text-xs font-medium text-gray-600 uppercase tracking-wide">Annual CO2 Savings</div>
                      <div className="text-xs text-gray-500 mt-1">tons CO2e/year</div>
                    </div>

                    <div className="bg-yellow-100 rounded-2xl p-5 border border-yellow-200">
                      <div className="text-2xl font-light mb-1 text-gray-800">
                        {formatCurrency(result.summary.total_annual_diesel_savings_usd)}
                      </div>
                      <div className="text-xs font-medium text-gray-600 uppercase tracking-wide">Annual Diesel Savings</div>
                      <div className="text-xs text-gray-500 mt-1">fuel cost avoided/year</div>
                    </div>

                    <div className="bg-gray-100 rounded-2xl p-5 border border-gray-200">
                      <div className="text-2xl font-light mb-1 text-gray-800">
                        {formatCurrency(result.summary.total_annual_opex_usd + result.summary.total_annual_energy_cost_usd)}
                      </div>
                      <div className="text-xs font-medium text-gray-600 uppercase tracking-wide">Annual Operating Cost</div>
                      <div className="text-xs text-gray-500 mt-1">OPEX + energy</div>
                    </div>
                  </div>

                  {/* Cost Breakdown Table */}
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
                    <div className="flex items-center mb-5">
                      <div className="w-1 h-8 bg-green-500 rounded-full mr-3"></div>
                      <h3 className="text-xl font-medium text-gray-800">Cost Breakdown</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 border-b-2 border-gray-200">
                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-600">Category</th>
                            <th className="px-3 py-3 text-right text-xs font-medium text-gray-600">Qty</th>
                            <th className="px-3 py-3 text-right text-xs font-medium text-gray-600">CAPEX</th>
                            <th className="px-3 py-3 text-right text-xs font-medium text-gray-600">Annual OPEX</th>
                            <th className="px-3 py-3 text-right text-xs font-medium text-gray-600">Energy Cost</th>
                            <th className="px-3 py-3 text-right text-xs font-medium text-gray-600">Diesel Savings</th>
                            <th className="px-3 py-3 text-right text-xs font-medium text-gray-600">Payback</th>
                          </tr>
                        </thead>
                        <tbody>
                          {result.categories.map((cat, idx) => (
                            <tr key={cat.category_key} className={`border-b border-gray-100 ${idx % 2 === 0 ? 'bg-blue-50/30' : 'bg-white'}`}>
                              <td className="px-3 py-3">
                                <div className="flex items-center gap-2">
                                  <div
                                    className="w-2.5 h-2.5 rounded-full"
                                    style={{ backgroundColor: CATEGORY_COLORS[cat.category_key] }}
                                  ></div>
                                  <span className="font-medium text-gray-800">{cat.display_name}</span>
                                </div>
                              </td>
                              <td className="px-3 py-3 text-right text-gray-700">
                                {cat.quantity} {cat.unit_label}{cat.quantity !== 1 ? 's' : ''}
                              </td>
                              <td className="px-3 py-3 text-right font-medium text-gray-800">{formatCurrency(cat.total_capex_usd)}</td>
                              <td className="px-3 py-3 text-right text-gray-700">{formatCurrency(cat.total_annual_opex_usd)}/yr</td>
                              <td className="px-3 py-3 text-right text-gray-700">{formatCurrency(cat.total_annual_energy_cost_usd)}/yr</td>
                              <td className="px-3 py-3 text-right text-green-600">{formatCurrency(cat.total_annual_diesel_savings_usd)}/yr</td>
                              <td className="px-3 py-3 text-right text-gray-700">
                                {cat.payback_years !== null ? `${cat.payback_years.toFixed(1)} yrs` : 'N/A'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-gray-50 border-t-2 border-gray-300">
                            <td className="px-3 py-3 font-medium text-gray-800">Total</td>
                            <td className="px-3 py-3"></td>
                            <td className="px-3 py-3 text-right font-bold text-gray-800">{formatCurrency(result.summary.total_investment_usd)}</td>
                            <td className="px-3 py-3 text-right font-medium text-gray-700">{formatCurrency(result.summary.total_annual_opex_usd)}/yr</td>
                            <td className="px-3 py-3 text-right font-medium text-gray-700">{formatCurrency(result.summary.total_annual_energy_cost_usd)}/yr</td>
                            <td className="px-3 py-3 text-right font-medium text-green-600">{formatCurrency(result.summary.total_annual_diesel_savings_usd)}/yr</td>
                            <td className="px-3 py-3"></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>

                  {/* Charts */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Bar Chart — CAPEX per category */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
                      <div className="flex items-center mb-4">
                        <div className="w-1 h-6 bg-purple-500 rounded-full mr-3"></div>
                        <h3 className="text-sm font-medium text-gray-700">Capital Investment by Category</h3>
                      </div>
                      <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={result.categories} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                          <XAxis
                            dataKey="display_name"
                            stroke="#999"
                            style={{ fontSize: '9px', fontWeight: 300 }}
                            tickFormatter={(value: string) => {
                              const words = value.split(' ')
                              return words.length > 2 ? words.slice(0, 2).join(' ') + '...' : value
                            }}
                          />
                          <YAxis
                            stroke="#999"
                            style={{ fontSize: '10px', fontWeight: 300 }}
                            tickFormatter={(value: number) =>
                              value >= 1000000 ? `$${(value / 1000000).toFixed(0)}M` : `$${(value / 1000).toFixed(0)}K`
                            }
                          />
                          <Tooltip
                            formatter={(value: any) => formatCurrency(value)}
                            contentStyle={{
                              backgroundColor: '#3D3D3D',
                              border: 'none',
                              borderRadius: '0',
                              color: 'white',
                              fontWeight: 300,
                              fontSize: '11px',
                            }}
                          />
                          <Bar dataKey="total_capex_usd" name="CAPEX" radius={[4, 4, 0, 0]}>
                            {result.categories.map((cat) => (
                              <Cell key={cat.category_key} fill={CATEGORY_COLORS[cat.category_key]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Pie Chart — Share of total investment */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
                      <div className="flex items-center mb-4">
                        <div className="w-1 h-6 bg-indigo-500 rounded-full mr-3"></div>
                        <h3 className="text-sm font-medium text-gray-700">Investment Share</h3>
                      </div>
                      <ResponsiveContainer width="100%" height={260}>
                        <PieChart>
                          <Pie
                            data={result.categories}
                            dataKey="total_capex_usd"
                            nameKey="display_name"
                            cx="50%"
                            cy="50%"
                            outerRadius={90}
                            innerRadius={45}
                            paddingAngle={2}
                            label={({ display_name, percent }: any) => {
                              const words = display_name.split(' ')
                              const short = words.length > 2 ? words.slice(0, 2).join(' ') : display_name
                              return `${short} ${(percent * 100).toFixed(0)}%`
                            }}
                            style={{ fontSize: '10px', fontWeight: 300 }}
                          >
                            {result.categories.map((cat) => (
                              <Cell key={cat.category_key} fill={CATEGORY_COLORS[cat.category_key]} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value: any) => formatCurrency(value)}
                            contentStyle={{
                              backgroundColor: '#3D3D3D',
                              border: 'none',
                              borderRadius: '0',
                              color: 'white',
                              fontWeight: 300,
                              fontSize: '11px',
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="text-center mt-2">
                        <div className="text-lg font-light text-gray-800">{formatCurrency(result.summary.total_investment_usd)}</div>
                        <div className="text-xs text-gray-500">Total Investment</div>
                      </div>
                    </div>
                  </div>

                  {/* Lifetime Savings */}
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
                    <div className="flex items-center mb-4">
                      <div className="w-1 h-6 bg-green-500 rounded-full mr-3"></div>
                      <h3 className="text-sm font-medium text-gray-700">Lifetime Net Savings</h3>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {result.categories.map(cat => (
                        <div key={cat.category_key} className="bg-gray-50 rounded-lg p-3 border border-gray-200 text-center">
                          <div
                            className="w-3 h-3 rounded-full mx-auto mb-2"
                            style={{ backgroundColor: CATEGORY_COLORS[cat.category_key] }}
                          ></div>
                          <div className="text-xs text-gray-600 mb-1 font-medium">{cat.display_name}</div>
                          <div className={`text-sm font-medium ${cat.lifetime_net_savings_usd >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                            {formatCurrency(cat.lifetime_net_savings_usd)}
                          </div>
                          <div className="text-xs text-gray-400 mt-1">over {cat.lifespan_years} years</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
