'use client'

import type { AggregatedTotals } from '@/lib/types'
import { formatCurrency, formatNumber } from '@/lib/format'

type Props = {
  totals: AggregatedTotals
}

type Row = {
  label: string
  baseline: string
  scenario: string
  delta: string
  deltaPositive: boolean
}

export default function ComparisonTable({ totals }: Props) {
  const { delta } = totals

  const rows: Row[] = [
    {
      label: 'Annual Diesel (litres)',
      baseline: formatNumber(totals.baseline_diesel_liters),
      scenario: formatNumber(totals.scenario_diesel_liters),
      delta: `-${formatNumber(delta.diesel_liters_saved)}`,
      deltaPositive: delta.diesel_liters_saved > 0,
    },
    {
      label: 'Annual Electricity (kWh)',
      baseline: formatNumber(totals.baseline_electricity_kwh),
      scenario: formatNumber(totals.scenario_electricity_kwh),
      delta: `+${formatNumber(delta.electricity_kwh_delta)}`,
      deltaPositive: true,
    },
    {
      label: 'Annual CO\u2082 (tons)',
      baseline: formatNumber(totals.baseline_co2_tons),
      scenario: formatNumber(totals.scenario_co2_tons),
      delta: `-${formatNumber(delta.co2_tons_saved)}`,
      deltaPositive: delta.co2_tons_saved > 0,
    },
    {
      label: 'Annual OPEX (USD)',
      baseline: formatCurrency(totals.baseline_total_opex_usd),
      scenario: formatCurrency(totals.scenario_total_opex_usd),
      delta: formatCurrency(delta.annual_opex_delta_usd),
      deltaPositive: delta.annual_opex_delta_usd <= 0,
    },
    {
      label: 'Total CAPEX (USD)',
      baseline: '-',
      scenario: formatCurrency(totals.total_capex_usd),
      delta: formatCurrency(totals.total_capex_usd),
      deltaPositive: false,
    },
  ]

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-100 shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-[#fafafa] text-[10px] font-semibold uppercase tracking-wide text-[#8c8c8c]">
            <th className="text-left py-3 px-4">Metric</th>
            <th className="text-right py-3 px-4 bg-[#f2f2f2]">Baseline</th>
            <th className="text-right py-3 px-4 bg-[#eef6fb]">Scenario</th>
            <th className="text-right py-3 px-4">Delta</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-t border-gray-50">
              <td className="py-3 px-4 font-medium text-[#414141]">{row.label}</td>
              <td className="py-3 px-4 text-right text-[#585858] bg-[#f9f9f9]">
                {row.baseline}
              </td>
              <td className="py-3 px-4 text-right text-[#585858] bg-[#f5fafd]">
                {row.scenario}
              </td>
              <td
                className="py-3 px-4 text-right font-semibold"
                style={{ color: row.deltaPositive ? '#447a7a' : '#9e5858' }}
              >
                {row.delta}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
