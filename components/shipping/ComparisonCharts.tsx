'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import type { AggregatedTotals } from '@/lib/types'

type Props = {
  totals: AggregatedTotals
}

export default function ComparisonCharts({ totals }: Props) {
  const dieselData = [
    {
      name: 'Diesel (L)',
      Baseline: Math.round(totals.baseline_diesel_liters),
      Scenario: Math.round(totals.scenario_diesel_liters),
    },
  ]

  const electricData = [
    {
      name: 'Electricity (kWh)',
      Baseline: Math.round(totals.baseline_electricity_kwh),
      Scenario: Math.round(totals.scenario_electricity_kwh),
    },
  ]

  const co2Data = [
    {
      name: 'CO\u2082 (tons)',
      Baseline: Math.round(totals.baseline_co2_tons),
      Scenario: Math.round(totals.scenario_co2_tons),
    },
  ]

  const opexData = [
    {
      name: 'OPEX (USD)',
      Baseline: Math.round(totals.baseline_total_opex_usd),
      Scenario: Math.round(totals.scenario_total_opex_usd),
    },
  ]

  const charts = [
    { data: dieselData, title: 'Annual Diesel Consumption' },
    { data: electricData, title: 'Annual Electricity Use' },
    { data: co2Data, title: 'Annual CO\u2082 Emissions' },
    { data: opexData, title: 'Annual Operating Cost' },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {charts.map((chart) => (
        <div
          key={chart.title}
          className="rounded-xl border border-gray-100 bg-white shadow-sm p-4"
        >
          <h4 className="text-xs font-semibold text-[#585858] mb-3">
            {chart.title}
          </h4>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={chart.data}
              margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Baseline" fill="#b0b0b0" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Scenario" fill="#3c5e86" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ))}
    </div>
  )
}
