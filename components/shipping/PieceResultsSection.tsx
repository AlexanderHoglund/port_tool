'use client'

import { useState } from 'react'
import type { PiecePortResult, PieceTerminalResult } from '@/lib/types'

type Props = {
  result: PiecePortResult
}

function formatNumber(n: number, decimals = 0): string {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

function formatCurrency(n: number): string {
  if (Math.abs(n) >= 1000000) {
    return `$${(n / 1000000).toFixed(2)}M`
  }
  if (Math.abs(n) >= 1000) {
    return `$${(n / 1000).toFixed(0)}K`
  }
  return `$${n.toFixed(0)}`
}

function SummaryCard({
  label,
  value,
  subtext,
  highlight = false,
}: {
  label: string
  value: string
  subtext?: string
  highlight?: boolean
}) {
  return (
    <div
      className={`rounded-xl p-5 ${
        highlight ? 'bg-[#3c5e86] text-white' : 'bg-white border border-gray-200'
      }`}
    >
      <div className={`text-[10px] font-bold uppercase tracking-wide ${highlight ? 'text-[#a8c8e0]' : 'text-[#8c8c8c]'}`}>
        {label}
      </div>
      <div className={`text-2xl font-light mt-1 ${highlight ? 'text-white' : 'text-[#414141]'}`}>
        {value}
      </div>
      {subtext && (
        <div className={`text-xs mt-1 ${highlight ? 'text-[#c8dff0]' : 'text-[#8c8c8c]'}`}>
          {subtext}
        </div>
      )}
    </div>
  )
}

function TerminalDetailCard({ terminal }: { terminal: PieceTerminalResult }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div
        className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-gray-50"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-[#8c8c8c]">{expanded ? '\u25BC' : '\u25B6'}</span>
          <span className="font-semibold text-[#414141]">{terminal.terminal_name}</span>
          <span className="text-[10px] text-white bg-[#3c5e86] px-2 py-0.5 rounded uppercase">
            {terminal.terminal_type}
          </span>
        </div>
        <div className="flex items-center gap-6 text-sm">
          <div className="text-right">
            <div className="text-[10px] text-[#8c8c8c]">CO₂ Saved</div>
            <div className="text-[#3c5e86] font-semibold">{formatNumber(terminal.annual_co2_savings_tons)} t</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-[#8c8c8c]">OPEX Savings</div>
            <div className={`font-semibold ${
              terminal.annual_opex_savings_usd >= 0 ? 'text-green-600' : 'text-amber-600'
            }`}>
              {terminal.annual_opex_savings_usd >= 0
                ? formatCurrency(terminal.annual_opex_savings_usd)
                : `+${formatCurrency(Math.abs(terminal.annual_opex_savings_usd))}`
              }
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-[#8c8c8c]">CAPEX</div>
            <div className="text-[#414141] font-semibold">{formatCurrency(terminal.total_capex_usd)}</div>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="px-5 py-4 border-t border-gray-100 space-y-6">
          {/* Equipment summary */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-[10px] font-bold uppercase text-[#8c8c8c] mb-2">Baseline Equipment</h4>
              <div className="space-y-1 text-sm">
                {terminal.baseline_equipment.map((eq) => (
                  <div key={eq.equipment_key} className="flex justify-between">
                    <span className="text-[#585858]">{eq.display_name} × {eq.quantity}</span>
                    <span className="text-[#8c8c8c]">{formatNumber(eq.annual_diesel_liters)} L diesel</span>
                  </div>
                ))}
                <div className="border-t pt-1 font-semibold flex justify-between">
                  <span>Total</span>
                  <span>{formatNumber(terminal.baseline_totals.total_diesel_liters)} L</span>
                </div>
              </div>
            </div>
            <div>
              <h4 className="text-[10px] font-bold uppercase text-[#8c8c8c] mb-2">Electrified Equipment</h4>
              <div className="space-y-1 text-sm">
                {terminal.scenario_equipment.map((eq) => (
                  <div key={eq.equipment_key} className="flex justify-between">
                    <span className="text-[#585858]">{eq.display_name} × {eq.quantity}</span>
                    <span className="text-[#8c8c8c]">{formatNumber(eq.annual_kwh)} kWh</span>
                  </div>
                ))}
                <div className="border-t pt-1 font-semibold flex justify-between">
                  <span>Total</span>
                  <span>{formatNumber(terminal.scenario_totals.total_kwh)} kWh</span>
                </div>
              </div>
            </div>
          </div>

          {/* Chargers */}
          {terminal.chargers.length > 0 && (
            <div>
              <h4 className="text-[10px] font-bold uppercase text-[#8c8c8c] mb-2">Charger Infrastructure</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-1 text-[10px] text-[#8c8c8c]">Type</th>
                      <th className="text-center py-1 text-[10px] text-[#8c8c8c]">Units</th>
                      <th className="text-center py-1 text-[10px] text-[#8c8c8c]">Chargers</th>
                      <th className="text-right py-1 text-[10px] text-[#8c8c8c]">CAPEX</th>
                    </tr>
                  </thead>
                  <tbody>
                    {terminal.chargers.map((c) => (
                      <tr key={c.evse_key} className="border-b border-gray-100">
                        <td className="py-1 text-[#585858]">{c.display_name}</td>
                        <td className="py-1 text-center">{c.equipment_count}</td>
                        <td className="py-1 text-center">{c.chargers_final}</td>
                        <td className="py-1 text-right">{formatCurrency(c.total_capex_usd)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="font-semibold">
                      <td colSpan={2}></td>
                      <td className="py-1 text-center">{terminal.charger_totals.total_chargers}</td>
                      <td className="py-1 text-right">{formatCurrency(terminal.charger_totals.total_capex_usd)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* Berths */}
          {terminal.berths.length > 0 && (
            <div>
              <h4 className="text-[10px] font-bold uppercase text-[#8c8c8c] mb-2">Berth Infrastructure (OPS)</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-1 text-[10px] text-[#8c8c8c]">Berth</th>
                      <th className="text-left py-1 text-[10px] text-[#8c8c8c]">Segment</th>
                      <th className="text-center py-1 text-[10px] text-[#8c8c8c]">OPS</th>
                      <th className="text-center py-1 text-[10px] text-[#8c8c8c]">MW</th>
                      <th className="text-right py-1 text-[10px] text-[#8c8c8c]">CAPEX</th>
                    </tr>
                  </thead>
                  <tbody>
                    {terminal.berths.map((b) => (
                      <tr key={b.berth_id} className="border-b border-gray-100">
                        <td className="py-1 text-[#585858]">{b.berth_name}</td>
                        <td className="py-1 text-[#8c8c8c]">{b.max_vessel_segment_name}</td>
                        <td className="py-1 text-center">{b.ops_enabled ? '✓' : '-'}</td>
                        <td className="py-1 text-center">{b.ops_enabled ? b.ops_power_mw.toFixed(1) : '-'}</td>
                        <td className="py-1 text-right">{formatCurrency(b.ops_total_capex_usd)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="font-semibold">
                      <td colSpan={4}></td>
                      <td className="py-1 text-right">{formatCurrency(terminal.berth_totals.total_ops_capex_usd)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* Grid */}
          <div>
            <h4 className="text-[10px] font-bold uppercase text-[#8c8c8c] mb-2">Grid Infrastructure</h4>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-[#8c8c8c]">Peak Demand:</span>
                <span className="float-right text-[#414141]">{terminal.grid.net_peak_demand_mw.toFixed(2)} MW</span>
              </div>
              <div>
                <span className="text-[#8c8c8c]">Substation:</span>
                <span className="float-right text-[#414141]">{formatCurrency(terminal.grid.substation_capex_usd)}</span>
              </div>
              <div>
                <span className="text-[#8c8c8c]">Cabling:</span>
                <span className="float-right text-[#414141]">{formatCurrency(terminal.grid.cable_capex_usd)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function PieceResultsSection({ result }: Props) {
  const { totals } = result

  return (
    <section className="space-y-6">
      <h2 className="text-[11px] font-bold uppercase tracking-widest text-[#8c8c8c]">
        PIECE Analysis Results
      </h2>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard
          label="CO₂ Reduction"
          value={`${formatNumber(totals.co2_tons_saved)} t`}
          subtext={`${totals.co2_reduction_percent.toFixed(1)}% reduction`}
          highlight
        />
        <SummaryCard
          label="Diesel Saved"
          value={`${formatNumber(totals.diesel_liters_saved / 1000000, 1)}M L`}
          subtext="annual litres avoided"
        />
        <SummaryCard
          label="Annual OPEX Savings"
          value={
            totals.annual_opex_savings_usd >= 0
              ? formatCurrency(totals.annual_opex_savings_usd)
              : formatCurrency(Math.abs(totals.annual_opex_savings_usd))
          }
          subtext={
            totals.annual_opex_savings_usd >= 0
              ? 'annual savings'
              : 'annual increase'
          }
        />
        <SummaryCard
          label="Simple Payback"
          value={totals.simple_payback_years ? `${totals.simple_payback_years.toFixed(1)} years` : 'N/A'}
          subtext="investment recovery"
        />
      </div>

      {/* CAPEX breakdown */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-[11px] font-bold uppercase tracking-widest text-[#8c8c8c] mb-4">
          CAPEX Breakdown
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div>
            <div className="text-[10px] text-[#8c8c8c]">Equipment</div>
            <div className="text-lg font-semibold text-[#414141]">{formatCurrency(totals.equipment_capex_usd)}</div>
          </div>
          <div>
            <div className="text-[10px] text-[#8c8c8c]">Chargers</div>
            <div className="text-lg font-semibold text-[#414141]">{formatCurrency(totals.charger_capex_usd)}</div>
          </div>
          <div>
            <div className="text-[10px] text-[#8c8c8c]">OPS Infrastructure</div>
            <div className="text-lg font-semibold text-[#414141]">{formatCurrency(totals.ops_capex_usd)}</div>
          </div>
          <div>
            <div className="text-[10px] text-[#8c8c8c]">Grid</div>
            <div className="text-lg font-semibold text-[#414141]">{formatCurrency(totals.grid_capex_usd)}</div>
          </div>
          <div className="bg-[#fafafa] rounded-lg p-3 -m-1">
            <div className="text-[10px] text-[#3c5e86] font-bold">TOTAL CAPEX</div>
            <div className="text-xl font-semibold text-[#3c5e86]">{formatCurrency(totals.total_capex_usd)}</div>
          </div>
        </div>
      </div>

      {/* Baseline vs Scenario comparison */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[#f5f3f0] rounded-xl p-5">
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-[#7a7267] mb-4">
            Baseline (Current Fleet)
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[#7a7267]">Diesel:</span>
              <span className="text-[#414141] font-semibold">{formatNumber(totals.baseline_diesel_liters / 1000000, 2)}M L/year</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#7a7267]">Electricity:</span>
              <span className="text-[#414141] font-semibold">{formatNumber(totals.baseline_kwh / 1000000, 2)} GWh/year</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#7a7267]">CO₂ Emissions:</span>
              <span className="text-[#414141] font-semibold">{formatNumber(totals.baseline_co2_tons)} t/year</span>
            </div>
            <div className="flex justify-between border-t border-[#d4cfc8] pt-2">
              <span className="text-[#7a7267]">Total OPEX:</span>
              <span className="text-[#414141] font-semibold">{formatCurrency(totals.baseline_opex_usd)}/year</span>
            </div>
          </div>
        </div>

        <div className="bg-[#edf5fb] rounded-xl p-5">
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-[#3c5e86] mb-4">
            Scenario (Electrified)
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[#5a8ab5]">Diesel:</span>
              <span className="text-[#414141] font-semibold">{formatNumber(totals.scenario_diesel_liters / 1000000, 2)}M L/year</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#5a8ab5]">Electricity:</span>
              <span className="text-[#414141] font-semibold">{formatNumber(totals.scenario_kwh / 1000000, 2)} GWh/year</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#5a8ab5]">CO₂ Emissions:</span>
              <span className="text-[#414141] font-semibold">{formatNumber(totals.scenario_co2_tons)} t/year</span>
            </div>
            <div className="flex justify-between border-t border-[#b8daf0] pt-2">
              <span className="text-[#5a8ab5]">Total OPEX:</span>
              <span className="text-[#414141] font-semibold">{formatCurrency(totals.scenario_opex_usd)}/year</span>
            </div>
          </div>
        </div>
      </div>

      {/* Terminal details */}
      <div className="space-y-4">
        <h3 className="text-[11px] font-bold uppercase tracking-widest text-[#8c8c8c]">
          Terminal Details
        </h3>
        {result.terminals.map((terminal) => (
          <TerminalDetailCard key={terminal.terminal_id} terminal={terminal} />
        ))}
      </div>

      {/* Economic assumptions used */}
      <div className="bg-[#fafafa] rounded-xl p-5">
        <h3 className="text-[11px] font-bold uppercase tracking-widest text-[#8c8c8c] mb-4">
          Economic Assumptions Used
        </h3>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-4 text-sm">
          {Object.entries(result.economic_assumptions_used).slice(0, 12).map(([key, value]) => (
            <div key={key}>
              <div className="text-[10px] text-[#8c8c8c]">{key.replace(/_/g, ' ')}</div>
              <div className="text-[#414141]">{typeof value === 'number' ? value.toFixed(2) : value}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
