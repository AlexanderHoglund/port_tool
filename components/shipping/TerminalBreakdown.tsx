'use client'

import { useState } from 'react'
import type { TerminalResult } from '@/lib/types'
import { formatCurrency, formatNumber } from '@/lib/format'

type Props = {
  terminals: TerminalResult[]
}

function MetricRow({
  label,
  baseline,
  scenario,
}: {
  label: string
  baseline: string
  scenario: string
}) {
  return (
    <tr className="border-t border-gray-50">
      <td className="py-2 px-3 text-xs text-[#585858]">{label}</td>
      <td className="py-2 px-3 text-xs text-right text-[#585858] bg-[#f9f9f9]">
        {baseline}
      </td>
      <td className="py-2 px-3 text-xs text-right text-[#585858] bg-[#f5fafd]">
        {scenario}
      </td>
    </tr>
  )
}

function TerminalDetail({ t }: { t: TerminalResult }) {
  return (
    <div className="space-y-4">
      {/* Onshore metrics */}
      <div>
        <h5 className="text-[10px] font-bold uppercase tracking-wide text-[#8c8c8c] mb-2">
          Onshore
        </h5>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] font-semibold uppercase tracking-wide text-[#8c8c8c]">
              <th className="text-left py-1 px-3">Metric</th>
              <th className="text-right py-1 px-3 bg-[#f2f2f2]">Baseline</th>
              <th className="text-right py-1 px-3 bg-[#eef6fb]">Scenario</th>
            </tr>
          </thead>
          <tbody>
            <MetricRow
              label="Diesel (L)"
              baseline={formatNumber(t.onshore_baseline.annual_diesel_liters)}
              scenario={formatNumber(t.onshore_scenario.annual_diesel_liters)}
            />
            <MetricRow
              label="Electricity (kWh)"
              baseline={formatNumber(t.onshore_baseline.annual_electricity_kwh)}
              scenario={formatNumber(t.onshore_scenario.annual_electricity_kwh)}
            />
            <MetricRow
              label="CO\u2082 (tons)"
              baseline={formatNumber(t.onshore_baseline.annual_co2_tons)}
              scenario={formatNumber(t.onshore_scenario.annual_co2_tons)}
            />
            <MetricRow
              label="OPEX (USD)"
              baseline={formatCurrency(t.onshore_baseline.annual_total_opex_usd)}
              scenario={formatCurrency(t.onshore_scenario.annual_total_opex_usd)}
            />
          </tbody>
        </table>
      </div>

      {/* Offshore metrics */}
      <div>
        <h5 className="text-[10px] font-bold uppercase tracking-wide text-[#8c8c8c] mb-2">
          Offshore
        </h5>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] font-semibold uppercase tracking-wide text-[#8c8c8c]">
              <th className="text-left py-1 px-3">Metric</th>
              <th className="text-right py-1 px-3 bg-[#f2f2f2]">Baseline</th>
              <th className="text-right py-1 px-3 bg-[#eef6fb]">Scenario</th>
            </tr>
          </thead>
          <tbody>
            <MetricRow
              label="Diesel (L)"
              baseline={formatNumber(t.offshore_baseline.total_diesel_liters)}
              scenario={formatNumber(t.offshore_scenario.total_diesel_liters)}
            />
            <MetricRow
              label="CO\u2082 (tons)"
              baseline={formatNumber(t.offshore_baseline.total_co2_tons)}
              scenario={formatNumber(t.offshore_scenario.total_co2_tons)}
            />
            <MetricRow
              label="Shore Power (kWh)"
              baseline="-"
              scenario={formatNumber(t.offshore_scenario.shore_power_kwh)}
            />
            <MetricRow
              label="Total Cost (USD)"
              baseline={formatCurrency(t.offshore_baseline.total_cost_usd)}
              scenario={formatCurrency(t.offshore_scenario.total_cost_usd)}
            />
          </tbody>
        </table>
      </div>

      {/* CAPEX & benchmark */}
      <div className="flex gap-6 text-xs text-[#585858]">
        <div>
          <span className="text-[#8c8c8c]">Scenario CAPEX: </span>
          <span className="font-semibold text-[#3c5e86]">
            {formatCurrency(t.scenario_capex_usd)}
          </span>
        </div>
        <div>
          <span className="text-[#8c8c8c]">Benchmark CO\u2082: </span>
          <span className="font-semibold">
            {formatNumber(t.benchmark.benchmark_co2_tons)} t
          </span>
        </div>
      </div>
    </div>
  )
}

export default function TerminalBreakdown({ terminals }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  return (
    <div className="space-y-3">
      <h3 className="text-[11px] font-bold uppercase tracking-widest text-[#8c8c8c]">
        Per-Terminal Breakdown
      </h3>

      {terminals.map((t) => {
        const isOpen = expandedId === t.terminal_id
        return (
          <div
            key={t.terminal_id}
            className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden"
          >
            <button
              type="button"
              onClick={() => setExpandedId(isOpen ? null : t.terminal_id)}
              className="w-full flex items-center justify-between px-5 py-3 hover:bg-[#fafafa] transition-colors"
            >
              <span className="text-sm font-semibold text-[#414141]">
                {t.terminal_name}
              </span>
              <span className="text-xs text-[#8c8c8c]">
                {isOpen ? 'Collapse' : 'Expand'}
              </span>
            </button>

            {isOpen && (
              <div className="px-5 pb-5 border-t border-gray-50">
                <TerminalDetail t={t} />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
