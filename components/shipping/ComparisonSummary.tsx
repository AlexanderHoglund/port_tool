'use client'

import type { AggregatedTotals } from '@/lib/types'
import { formatCurrency, formatNumber } from '@/lib/format'

type Props = {
  totals: AggregatedTotals
}

type CardDef = {
  label: string
  value: string
  sub?: string
  color: string
}

export default function ComparisonSummary({ totals }: Props) {
  const { delta } = totals

  const cards: CardDef[] = [
    {
      label: 'CO\u2082 Reduction',
      value: `${formatNumber(delta.co2_tons_saved)} t`,
      sub: `${totals.baseline_co2_tons > 0 ? ((delta.co2_tons_saved / totals.baseline_co2_tons) * 100).toFixed(1) : '0'}% reduction`,
      color: delta.co2_tons_saved > 0 ? '#447a7a' : '#9e5858',
    },
    {
      label: 'Diesel Saved',
      value: `${formatNumber(delta.diesel_liters_saved)} L`,
      sub: 'annual litres avoided',
      color: delta.diesel_liters_saved > 0 ? '#447a7a' : '#9e5858',
    },
    {
      label: 'Annual OPEX Change',
      value: formatCurrency(delta.annual_opex_delta_usd),
      sub: delta.annual_opex_delta_usd < 0 ? 'annual savings' : 'annual increase',
      color: delta.annual_opex_delta_usd <= 0 ? '#447a7a' : '#9e5858',
    },
    {
      label: 'Total CAPEX Required',
      value: formatCurrency(delta.total_capex_required_usd),
      color: '#3c5e86',
    },
    {
      label: 'Simple Payback',
      value:
        delta.simple_payback_years !== null
          ? `${delta.simple_payback_years.toFixed(1)} years`
          : 'N/A',
      sub:
        delta.simple_payback_years !== null
          ? 'investment recovery period'
          : 'no net savings',
      color: '#bc8e54',
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-xl border border-gray-100 bg-white shadow-sm p-4 text-center"
        >
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[#8c8c8c] mb-1">
            {card.label}
          </p>
          <p className="text-lg font-bold" style={{ color: card.color }}>
            {card.value}
          </p>
          {card.sub && (
            <p className="text-[10px] text-[#8c8c8c] mt-0.5">{card.sub}</p>
          )}
        </div>
      ))}
    </div>
  )
}
