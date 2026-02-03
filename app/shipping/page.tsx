'use client'

import { useState } from 'react'
import { LineChart, Line, BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

const REGIONS = ['Global', 'EU', 'US East', 'US West', 'Asia Pacific']
const SHIP_TYPES = ['Container', 'Bulk Carrier', 'Tanker', 'RoRo', 'Cruise']
const FUEL_TYPES = ['HFO', 'VLSFO', 'MGO', 'LNG', 'Methanol', 'Ammonia']

type TCOResult = {
  total_capex_usd: number
  net_present_cost_usd: number
  total_emissions_tco2e: number
  annual_fuel_mass_tons: number
  annual_emissions_tons: number
  yearly_projections: Array<{
    year: number
    fuel_price_per_ton: number
    fuel_cost_usd: number
    opex_usd: number
    carbon_cost_usd: number
    total_annual_cost_usd: number
    present_value_usd: number
    emissions_tco2e: number
  }>
  inputs: any
}

export default function ShippingTCOPage() {
  const [formData, setFormData] = useState({
    region: 'EU',
    ship_type: 'Container',
    fuel_type: 'Methanol',
    annual_energy_demand_mwh: 50000,
    discount_rate: 0.05,
    co2_tax_per_ton: 50
  })

  const [result, setResult] = useState<TCOResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCalculate = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/tco/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          save_scenario: true
        })
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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  const formatNumber = (value: number, decimals = 2) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(value)
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 py-12">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-light text-gray-800 mb-3">
              Shipping TCO Estimator
            </h1>
            <p className="text-sm text-gray-600 font-light max-w-2xl mx-auto">
              Calculate Total Cost of Ownership and emissions for different fuel types across the global maritime industry
            </p>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      {result && (
        <div className="max-w-6xl mx-auto px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-green-100 rounded-2xl p-6 border border-green-200">
              <div className="text-2xl font-light mb-1 text-gray-800">{formatCurrency(result.net_present_cost_usd)}</div>
              <div className="text-xs font-medium text-gray-600 uppercase tracking-wide">Net Present Cost</div>
              <div className="text-xs text-gray-500 mt-1">(2025-2035)</div>
            </div>

            <div className="bg-blue-100 rounded-2xl p-6 border border-blue-200">
              <div className="text-2xl font-light mb-1 text-gray-800">{formatNumber(result.total_emissions_tco2e / 1000, 1)}K tons</div>
              <div className="text-xs font-medium text-gray-600 uppercase tracking-wide">Total CO2 Emissions</div>
              <div className="text-xs text-gray-500 mt-1">over lifetime</div>
            </div>

            <div className="bg-yellow-100 rounded-2xl p-6 border border-yellow-200">
              <div className="text-2xl font-light mb-1 text-gray-800">{formatCurrency(result.total_capex_usd)}</div>
              <div className="text-xs font-medium text-gray-600 uppercase tracking-wide">Capital Investment</div>
              <div className="text-xs text-gray-500 mt-1">CAPEX required</div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="bg-gray-50 min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          {/* Input Form */}
          <div className="bg-white rounded-2xl p-6 lg:p-8 mb-6 shadow-sm border border-gray-200">
            <div className="flex items-center mb-6">
              <div className="w-1 h-8 bg-blue-500 rounded-full mr-3"></div>
              <h2 className="text-xl font-medium text-gray-800">
                Configuration Parameters
              </h2>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
                  <label className="block text-xs font-medium text-gray-600 mb-2">
                    Region
                  </label>
                  <select
                    value={formData.region}
                    onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all bg-white"
                  >
                    {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>

                <div className="bg-green-50 rounded-xl p-3 border border-green-100">
                  <label className="block text-xs font-medium text-gray-600 mb-2">
                    Ship Type
                  </label>
                  <select
                    value={formData.ship_type}
                    onChange={(e) => setFormData({ ...formData, ship_type: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm focus:border-green-400 focus:ring-2 focus:ring-green-100 focus:outline-none transition-all bg-white"
                  >
                    {SHIP_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div className="bg-yellow-50 rounded-xl p-3 border border-yellow-100">
                  <label className="block text-xs font-medium text-gray-600 mb-2">
                    Fuel Type
                  </label>
                  <select
                    value={formData.fuel_type}
                    onChange={(e) => setFormData({ ...formData, fuel_type: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100 focus:outline-none transition-all bg-white"
                  >
                    {FUEL_TYPES.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
                  <label className="block text-xs font-medium text-gray-600 mb-2">
                    Annual Energy Demand (MWh)
                  </label>
                  <input
                    type="number"
                    value={formData.annual_energy_demand_mwh}
                    onChange={(e) => setFormData({ ...formData, annual_energy_demand_mwh: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all"
                  />
                </div>

                <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
                  <label className="block text-xs font-medium text-gray-600 mb-2">
                    Discount Rate
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.discount_rate}
                    onChange={(e) => setFormData({ ...formData, discount_rate: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all"
                  />
                  <p className="text-xs text-gray-500 mt-1">e.g., 0.05 = 5%</p>
                </div>

                <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
                  <label className="block text-xs font-medium text-gray-600 mb-2">
                    CO2 Tax ($/tCO2e)
                  </label>
                  <input
                    type="number"
                    value={formData.co2_tax_per_ton}
                    onChange={(e) => setFormData({ ...formData, co2_tax_per_ton: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all"
                  />
                </div>
              </div>

              <button
                onClick={handleCalculate}
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm py-3 px-6 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {loading ? 'Calculating...' : 'Calculate TCO'}
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-2xl text-red-700 px-5 py-4 mb-6 text-sm">
              <p className="font-medium">{error}</p>
            </div>
          )}

          {/* Results */}
          {result && (
            <>
              {/* Additional Metrics */}
              <div className="bg-white rounded-2xl p-6 lg:p-8 mb-6 shadow-sm border border-gray-200">
                <div className="flex items-center mb-6">
                  <div className="w-1 h-8 bg-green-500 rounded-full mr-3"></div>
                  <h2 className="text-xl font-medium text-gray-800">
                    Analysis Results
                  </h2>
                </div>

                {/* Key Metrics Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                  <div className="bg-green-50 rounded-xl p-4 border border-green-100">
                    <div className="text-xs text-gray-600 mb-1 font-medium">Fuel Availability</div>
                    <div className="text-sm font-medium text-green-700">✓ Available</div>
                    <div className="text-xs text-gray-500 mt-1">{formData.region}</div>
                  </div>

                  <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                    <div className="text-xs text-gray-600 mb-1 font-medium">Fuel Mass</div>
                    <div className="text-sm font-medium text-gray-800">{formatNumber(result.annual_fuel_mass_tons, 0)}</div>
                    <div className="text-xs text-gray-500 mt-1">tons/year</div>
                  </div>

                  <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-100">
                    <div className="text-xs text-gray-600 mb-1 font-medium">Emissions</div>
                    <div className="text-sm font-medium text-gray-800">{formatNumber(result.annual_emissions_tons, 0)}</div>
                    <div className="text-xs text-gray-500 mt-1">tCO2e/year</div>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <div className="text-xs text-gray-600 mb-1 font-medium">Configuration</div>
                    <div className="text-sm font-medium text-gray-800">{formData.ship_type}</div>
                    <div className="text-xs text-gray-500 mt-1">{formData.fuel_type}</div>
                  </div>
                </div>
              </div>

              {/* Charts and Visualizations */}
              <div className="bg-white rounded-2xl p-6 lg:p-8 mb-6 shadow-sm border border-gray-200">
                <div className="flex items-center mb-6">
                  <div className="w-1 h-8 bg-purple-500 rounded-full mr-3"></div>
                  <h2 className="text-xl font-medium text-gray-800">
                    Cost Analysis & Projections
                  </h2>
                </div>

                {/* Charts Grid - 3 columns on desktop */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
                  {/* Cost Trends Over Time */}
                  <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                    <h3 className="text-xs font-medium text-gray-700 mb-3">Annual Cost Breakdown</h3>
                    <ResponsiveContainer width="100%" height={180}>
                      <LineChart data={result.yearly_projections}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                        <XAxis
                          dataKey="year"
                          stroke="#999"
                          style={{ fontSize: '10px', fontWeight: 300 }}
                          tickFormatter={(value) => `'${value.toString().slice(-2)}`}
                        />
                        <YAxis
                          stroke="#999"
                          style={{ fontSize: '10px', fontWeight: 300 }}
                          tickFormatter={(value) => `$${(value / 1000000).toFixed(0)}M`}
                        />
                        <Tooltip
                          formatter={(value: any) => formatCurrency(value)}
                          contentStyle={{
                            backgroundColor: '#3D3D3D',
                            border: 'none',
                            borderRadius: '0',
                            color: 'white',
                            fontWeight: 300,
                            fontSize: '11px'
                          }}
                        />
                        <Legend
                          wrapperStyle={{ fontWeight: 300, fontSize: '10px' }}
                        />
                        <Line
                          type="monotone"
                          dataKey="fuel_cost_usd"
                          stroke="#3D3D3D"
                          strokeWidth={1.5}
                          name="Fuel"
                          dot={false}
                        />
                        <Line
                          type="monotone"
                          dataKey="opex_usd"
                          stroke="#7AB893"
                          strokeWidth={1.5}
                          name="OPEX"
                          dot={false}
                        />
                        <Line
                          type="monotone"
                          dataKey="carbon_cost_usd"
                          stroke="#C19A6B"
                          strokeWidth={1.5}
                          name="Carbon"
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Present Value Trend */}
                  <div className="bg-green-50 rounded-xl p-4 border border-green-100">
                    <h3 className="text-xs font-medium text-gray-700 mb-3">Present Value by Year</h3>
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={result.yearly_projections}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                        <XAxis
                          dataKey="year"
                          stroke="#999"
                          style={{ fontSize: '10px', fontWeight: 300 }}
                          tickFormatter={(value) => `'${value.toString().slice(-2)}`}
                        />
                        <YAxis
                          stroke="#999"
                          style={{ fontSize: '10px', fontWeight: 300 }}
                          tickFormatter={(value) => `$${(value / 1000000).toFixed(0)}M`}
                        />
                        <Tooltip
                          formatter={(value: any) => formatCurrency(value)}
                          contentStyle={{
                            backgroundColor: '#7AB893',
                            border: 'none',
                            borderRadius: '0',
                            color: 'white',
                            fontWeight: 300,
                            fontSize: '11px'
                          }}
                        />
                        <Bar
                          dataKey="present_value_usd"
                          fill="#7AB893"
                          name="Present Value"
                          radius={[0, 0, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Emissions Trend */}
                  <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-100">
                    <h3 className="text-xs font-medium text-gray-700 mb-3">CO2 Emissions Over Time</h3>
                    <ResponsiveContainer width="100%" height={180}>
                      <AreaChart data={result.yearly_projections}>
                        <defs>
                          <linearGradient id="colorEmissions" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#C19A6B" stopOpacity={0.6}/>
                            <stop offset="95%" stopColor="#C19A6B" stopOpacity={0.1}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                        <XAxis
                          dataKey="year"
                          stroke="#999"
                          style={{ fontSize: '10px', fontWeight: 300 }}
                          tickFormatter={(value) => `'${value.toString().slice(-2)}`}
                        />
                        <YAxis
                          stroke="#999"
                          style={{ fontSize: '10px', fontWeight: 300 }}
                          tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
                        />
                        <Tooltip
                          formatter={(value: any) => `${formatNumber(value, 0)} tons`}
                          contentStyle={{
                            backgroundColor: '#3D3D3D',
                            border: 'none',
                            borderRadius: '0',
                            color: 'white',
                            fontWeight: 300,
                            fontSize: '11px'
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="emissions_tco2e"
                          stroke="#C19A6B"
                          strokeWidth={1.5}
                          fillOpacity={1}
                          fill="url(#colorEmissions)"
                          name="Emissions"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Cost Breakdown - Infographic Style */}
                <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                  <h3 className="text-sm font-medium text-gray-700 mb-4">Cost Composition</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-white rounded-lg p-3 border border-gray-200 text-center">
                      <div className="w-3 h-3 rounded-full bg-blue-500 mx-auto mb-2"></div>
                      <div className="text-xs text-gray-600 mb-1 font-medium">CAPEX</div>
                      <div className="text-sm font-medium text-gray-800">{formatCurrency(result.total_capex_usd)}</div>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-gray-200 text-center">
                      <div className="w-3 h-3 rounded-full bg-purple-500 mx-auto mb-2"></div>
                      <div className="text-xs text-gray-600 mb-1 font-medium">Fuel</div>
                      <div className="text-sm font-medium text-gray-800">
                        {formatCurrency(result.yearly_projections.reduce((sum, p) => sum + p.fuel_cost_usd, 0))}
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-gray-200 text-center">
                      <div className="w-3 h-3 rounded-full bg-green-500 mx-auto mb-2"></div>
                      <div className="text-xs text-gray-600 mb-1 font-medium">OPEX</div>
                      <div className="text-sm font-medium text-gray-800">
                        {formatCurrency(result.yearly_projections.reduce((sum, p) => sum + p.opex_usd, 0))}
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-gray-200 text-center">
                      <div className="w-3 h-3 rounded-full bg-yellow-500 mx-auto mb-2"></div>
                      <div className="text-xs text-gray-600 mb-1 font-medium">Carbon</div>
                      <div className="text-sm font-medium text-gray-800">
                        {formatCurrency(result.yearly_projections.reduce((sum, p) => sum + p.carbon_cost_usd, 0))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Yearly Projections Table */}
              <div className="bg-white rounded-2xl p-6 lg:p-8 shadow-sm border border-gray-200">
                <div className="flex items-center mb-5">
                  <div className="w-1 h-8 bg-indigo-500 rounded-full mr-3"></div>
                  <h3 className="text-xl font-medium text-gray-800">
                    Annual Cost Projections (2025-2035)
                  </h3>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b-2 border-gray-200">
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-600">Year</th>
                        <th className="px-3 py-3 text-right text-xs font-medium text-gray-600">Fuel Price</th>
                        <th className="px-3 py-3 text-right text-xs font-medium text-gray-600">Fuel Cost</th>
                        <th className="px-3 py-3 text-right text-xs font-medium text-gray-600">OPEX</th>
                        <th className="px-3 py-3 text-right text-xs font-medium text-gray-600">Carbon Cost</th>
                        <th className="px-3 py-3 text-right text-xs font-medium text-gray-600">Total Annual</th>
                        <th className="px-3 py-3 text-right text-xs font-medium text-gray-600">Present Value</th>
                        <th className="px-3 py-3 text-right text-xs font-medium text-gray-600">Emissions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.yearly_projections.map((proj, idx) => (
                        <tr key={proj.year} className={`border-b border-gray-100 ${idx % 2 === 0 ? 'bg-blue-50/30' : 'bg-white'}`}>
                          <td className="px-3 py-3 font-medium text-gray-800">{proj.year}</td>
                          <td className="px-3 py-3 text-right text-gray-700">${formatNumber(proj.fuel_price_per_ton, 2)}</td>
                          <td className="px-3 py-3 text-right text-gray-700">{formatCurrency(proj.fuel_cost_usd)}</td>
                          <td className="px-3 py-3 text-right text-gray-700">{formatCurrency(proj.opex_usd)}</td>
                          <td className="px-3 py-3 text-right text-gray-700">{formatCurrency(proj.carbon_cost_usd)}</td>
                          <td className="px-3 py-3 text-right font-medium text-gray-800">{formatCurrency(proj.total_annual_cost_usd)}</td>
                          <td className="px-3 py-3 text-right font-medium text-green-600">{formatCurrency(proj.present_value_usd)}</td>
                          <td className="px-3 py-3 text-right text-gray-700">{formatNumber(proj.emissions_tco2e, 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
