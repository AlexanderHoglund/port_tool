'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import type { PiecePortResult, PieceTerminalResult, ScopedEmissions, OwnershipBreakdown, ScopedEmissionsBreakdown } from '@/lib/types'

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
  return '$' + Math.round(n).toLocaleString()
}

function SummaryCard({
  label,
  value,
  subtext,
  icon,
  highlight = false,
  danger = false,
  success = false,
}: {
  label: string
  value: string
  subtext?: string
  icon?: string
  highlight?: boolean
  danger?: boolean
  success?: boolean
}) {
  const bg = danger
    ? 'bg-[#feeeea] border border-[#fac8c2]'
    : success
      ? 'bg-[#eefae8] border border-[#c2e6b8]'
      : highlight
        ? 'bg-[#3c5e86] text-white'
        : 'bg-white border border-gray-200'

  const labelColor = danger
    ? 'text-[#9e5858]'
    : success
      ? 'text-[#3a7a3a]'
      : highlight ? 'text-[#a8c8e0]' : 'text-[#8c8c8c]'

  const valueColor = danger
    ? 'text-[#9e5858]'
    : success
      ? 'text-[#2d6a2d]'
      : highlight ? 'text-white' : 'text-[#414141]'

  const subtextColor = danger
    ? 'text-[#c07070]'
    : success
      ? 'text-[#5a9a5a]'
      : highlight ? 'text-[#c8dff0]' : 'text-[#8c8c8c]'

  return (
    <div className={`rounded-xl p-5 ${bg}`}>
      <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide ${labelColor}`}>
        {icon && (
          <Image
            src={icon}
            alt=""
            width={18}
            height={18}
            className={highlight ? 'invert brightness-200 opacity-70' : 'opacity-40'}
          />
        )}
        {label}
      </div>
      <div className={`text-2xl font-light mt-1 ${valueColor}`}>
        {value}
      </div>
      {subtext && (
        <div className={`text-xs mt-1 ${subtextColor}`}>
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
            <div className="text-[10px] text-[#8c8c8c]">CO₂ Change</div>
            <div className={`font-semibold ${
              terminal.annual_co2_savings_tons >= 0 ? 'text-[#3c5e86]' : 'text-amber-600'
            }`}>{terminal.annual_co2_savings_tons >= 0 ? '-' : '+'}{formatNumber(Math.abs(terminal.annual_co2_savings_tons))} t</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-[#8c8c8c]">OPEX Change</div>
            <div className={`font-semibold ${
              terminal.annual_opex_savings_usd >= 0 ? 'text-green-600' : 'text-amber-600'
            }`}>
              {terminal.annual_opex_savings_usd >= 0
                ? `-${formatCurrency(terminal.annual_opex_savings_usd)}`
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
              <h4 className="text-[10px] font-bold uppercase text-[#8c8c8c] mb-2">Berth Infrastructure (OPS & DC)</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-1 text-[10px] text-[#8c8c8c]">Berth</th>
                      <th className="text-left py-1 text-[10px] text-[#8c8c8c]">Max Segment</th>
                      <th className="text-center py-1 text-[10px] text-[#8c8c8c]">Calls/Yr</th>
                      <th className="text-center py-1 text-[10px] text-[#8c8c8c]">OPS</th>
                      <th className="text-center py-1 text-[10px] text-[#8c8c8c]">OPS MW</th>
                      <th className="text-right py-1 text-[10px] text-[#8c8c8c]">OPS CAPEX</th>
                      <th className="text-center py-1 text-[10px] text-[#8c8c8c]">DC</th>
                      <th className="text-center py-1 text-[10px] text-[#8c8c8c]">DC MW</th>
                      <th className="text-right py-1 text-[10px] text-[#8c8c8c]">DC CAPEX</th>
                    </tr>
                  </thead>
                  <tbody>
                    {terminal.berths.map((b) => (
                      <tr key={b.berth_id} className="border-b border-gray-100">
                        <td className="py-1 text-[#585858]">{b.berth_name}</td>
                        <td className="py-1 text-[#8c8c8c]">{b.max_vessel_segment_name}</td>
                        <td className="py-1 text-center text-[#8c8c8c]">{b.total_annual_calls.toLocaleString()}</td>
                        <td className="py-1 text-center">{b.ops_enabled ? '✓' : '-'}</td>
                        <td className="py-1 text-center">{b.ops_enabled ? b.ops_power_mw.toFixed(1) : '-'}</td>
                        <td className="py-1 text-right">{formatCurrency(b.ops_total_capex_usd)}</td>
                        <td className="py-1 text-center">{b.dc_enabled ? '✓' : '-'}</td>
                        <td className="py-1 text-center">{b.dc_enabled ? b.dc_power_mw.toFixed(1) : '-'}</td>
                        <td className="py-1 text-right">{formatCurrency(b.dc_capex_usd)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="font-semibold">
                      <td colSpan={5}></td>
                      <td className="py-1 text-right">{formatCurrency(terminal.berth_totals.total_ops_capex_usd)}</td>
                      <td colSpan={2}></td>
                      <td className="py-1 text-right">{formatCurrency(terminal.berth_totals.total_dc_capex_usd)}</td>
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

/** Compute per-line-item CO2 for a given scope from terminal results */
function buildScopeLineItems(
  terminals: PieceTerminalResult[],
  scopeKey: 'scope_1_tons' | 'scope_2_tons' | 'scope_3_tons',
  dieselEfWtw: number,
  gridEf: number,
  portServices?: PiecePortResult['port_services'],
): { name: string; baseline: number; scenario: number }[] {
  const items: { name: string; baseline: number; scenario: number }[] = []

  for (const t of terminals) {
    const prefix = terminals.length > 1 ? `${t.terminal_name} — ` : ''

    // Equipment line items
    const blEquipMap = new Map(t.baseline_equipment.map((e) => [e.equipment_key, e]))
    const scEquipMap = new Map(t.scenario_equipment.map((e) => [e.equipment_key, e]))
    const allKeys = new Set([...blEquipMap.keys(), ...scEquipMap.keys()])

    for (const key of allKeys) {
      const bl = blEquipMap.get(key)
      const sc = scEquipMap.get(key)
      if (!bl && !sc) continue
      const portFrac = bl?.port_fraction ?? sc?.port_fraction ?? 1

      let blCo2 = 0, scCo2 = 0
      if (scopeKey === 'scope_1_tons') {
        // Scope 1: port-owned diesel
        blCo2 = ((bl?.annual_diesel_liters ?? 0) * dieselEfWtw / 1000) * portFrac
        scCo2 = ((sc?.annual_diesel_liters ?? 0) * dieselEfWtw / 1000) * portFrac
      } else if (scopeKey === 'scope_2_tons') {
        // Scope 2: port-owned electricity
        blCo2 = ((bl?.annual_kwh ?? 0) * gridEf / 1000) * portFrac
        scCo2 = ((sc?.annual_kwh ?? 0) * gridEf / 1000) * portFrac
      } else {
        // Scope 3: third-party (all fuel types)
        const thirdFrac = 1 - portFrac
        blCo2 = ((bl?.annual_diesel_liters ?? 0) * dieselEfWtw / 1000 + (bl?.annual_kwh ?? 0) * gridEf / 1000) * thirdFrac
        scCo2 = ((sc?.annual_diesel_liters ?? 0) * dieselEfWtw / 1000 + (sc?.annual_kwh ?? 0) * gridEf / 1000) * thirdFrac
      }
      if (blCo2 === 0 && scCo2 === 0) continue
      items.push({ name: `${prefix}${bl?.display_name ?? sc?.display_name ?? key}`, baseline: blCo2, scenario: scCo2 })
    }

    // OPS / Shore power
    const berthBl = t.berth_totals.baseline_co2_tons
    const berthScShorePower = (t.berth_totals.scenario_shore_power_kwh * gridEf) / 1000
    const berthScDiesel = t.berth_totals.scenario_co2_tons - berthScShorePower
    // Berth ownership inherits terminal ownership (same port_fraction as equipment)
    const termPortFrac = t.baseline_equipment[0]?.port_fraction ?? 1

    if (scopeKey === 'scope_2_tons') {
      // Shore power grid CO2 → scope 2 if port-owned
      const blVal = 0 // baseline has no shore power
      const scVal = berthScShorePower * termPortFrac
      if (scVal > 0) items.push({ name: `${prefix}Shore Power (OPS)`, baseline: blVal, scenario: scVal })
    } else if (scopeKey === 'scope_3_tons') {
      // Baseline: all vessel HFO → scope 3; Scenario: remaining diesel + third-party shore power
      const blVal = berthBl
      const scVal = berthScDiesel + berthScShorePower * (1 - termPortFrac)
      if (blVal > 0 || scVal > 0) items.push({ name: `${prefix}Vessel At-Berth`, baseline: blVal, scenario: scVal })
    }
  }

  // Port services
  if (portServices) {
    const tugOwn = portServices.tugs_ownership ?? 'port'
    const pilotOwn = portServices.pilot_boats_ownership ?? 'port'
    const tugDieselBl = (portServices.baseline_tug_fuel_liters * dieselEfWtw) / 1000
    const tugElecBl = (portServices.baseline_tug_energy_kwh * gridEf) / 1000
    const pilotDieselBl = (portServices.baseline_pilot_fuel_liters * dieselEfWtw) / 1000
    const pilotElecBl = (portServices.baseline_pilot_energy_kwh * gridEf) / 1000
    const tugDieselSc = (portServices.scenario_tug_fuel_liters * dieselEfWtw) / 1000
    const tugElecSc = (portServices.scenario_tug_energy_kwh * gridEf) / 1000
    const pilotDieselSc = (portServices.scenario_pilot_fuel_liters * dieselEfWtw) / 1000
    const pilotElecSc = (portServices.scenario_pilot_energy_kwh * gridEf) / 1000

    if (scopeKey === 'scope_1_tons') {
      if (tugOwn === 'port' && (tugDieselBl > 0 || tugDieselSc > 0))
        items.push({ name: 'Tugs (diesel)', baseline: tugDieselBl, scenario: tugDieselSc })
      if (pilotOwn === 'port' && (pilotDieselBl > 0 || pilotDieselSc > 0))
        items.push({ name: 'Pilot Boats (diesel)', baseline: pilotDieselBl, scenario: pilotDieselSc })
    } else if (scopeKey === 'scope_2_tons') {
      if (tugOwn === 'port' && (tugElecBl > 0 || tugElecSc > 0))
        items.push({ name: 'Tugs (electricity)', baseline: tugElecBl, scenario: tugElecSc })
      if (pilotOwn === 'port' && (pilotElecBl > 0 || pilotElecSc > 0))
        items.push({ name: 'Pilot Boats (electricity)', baseline: pilotElecBl, scenario: pilotElecSc })
    } else {
      if (tugOwn !== 'port') {
        const bl = tugDieselBl + tugElecBl, sc = tugDieselSc + tugElecSc
        if (bl > 0 || sc > 0) items.push({ name: 'Tugs (3rd party)', baseline: bl, scenario: sc })
      }
      if (pilotOwn !== 'port') {
        const bl = pilotDieselBl + pilotElecBl, sc = pilotDieselSc + pilotElecSc
        if (bl > 0 || sc > 0) items.push({ name: 'Pilot Boats (3rd party)', baseline: bl, scenario: sc })
      }
    }
  }

  return items
}

function ScopeEmissionsCard({
  baseline, scenario, gridEf, result,
}: {
  baseline: ScopedEmissions; scenario: ScopedEmissions; gridEf: number
  result: PiecePortResult
}) {
  const [openScopes, setOpenScopes] = useState<Record<string, boolean>>({})
  const toggleScope = (label: string) => setOpenScopes((prev) => ({ ...prev, [label]: !prev[label] }))

  const dieselEfWtw = result.economic_assumptions_used['diesel_ef_wtw'] ?? 3.28564

  const scopes = [
    { label: 'Scope 1', sublabel: 'Port-owned diesel (direct combustion)', color: '#c62828',
      baseline: baseline.scope_1_tons, scenario: scenario.scope_1_tons, scopeKey: 'scope_1_tons' as const },
    { label: 'Scope 2', sublabel: 'Port-owned electricity (purchased energy)', color: '#1565c0',
      baseline: baseline.scope_2_tons, scenario: scenario.scope_2_tons, scopeKey: 'scope_2_tons' as const },
    { label: 'Scope 3', sublabel: 'Third-party owned (all fuel types)', color: '#6a5e4c',
      baseline: baseline.scope_3_tons, scenario: scenario.scope_3_tons, scopeKey: 'scope_3_tons' as const },
  ]

  const baselineTotal = baseline.total_tons
  const scenarioTotal = scenario.total_tons
  const totalDelta = baselineTotal - scenarioTotal
  const totalPct = baselineTotal > 0 ? (totalDelta / baselineTotal) * 100 : 0

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-[11px] font-bold uppercase tracking-widest text-[#8c8c8c] mb-4">
        Emissions by Scope (GHG Protocol)
      </h3>
      {gridEf === 0 && (
        <div className="mb-4 rounded-lg px-4 py-2.5 bg-amber-50 border border-amber-200 text-xs text-amber-800">
          <strong>Grid emission factor is 0</strong> (100% green grid assumed). Scope 2 will be zero.
          Set <code className="bg-amber-100 px-1 rounded">grid_ef</code> in Assumptions &gt; Economic Parameters to model grid carbon intensity (e.g. 0.4 kgCO₂/kWh).
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-2 text-[10px] font-bold uppercase text-[#8c8c8c]"></th>
              <th className="text-right py-2 px-3 text-[10px] font-bold uppercase text-[#8c8c8c]">Baseline</th>
              <th className="text-right py-2 px-3 text-[10px] font-bold uppercase text-[#8c8c8c]">Scenario</th>
              <th className="text-right py-2 px-3 text-[10px] font-bold uppercase text-[#414141]">Change</th>
            </tr>
          </thead>
          <tbody>
            {scopes.map((s) => {
              const delta = s.baseline - s.scenario
              const pct = s.baseline > 0 ? (delta / s.baseline) * 100 : 0
              const isOpen = !!openScopes[s.label]
              const lineItems = isOpen
                ? buildScopeLineItems(result.terminals, s.scopeKey, dieselEfWtw, gridEf, result.port_services)
                : []

              return (
                <React.Fragment key={s.label}>
                  {/* Scope total row */}
                  <tr
                    className="border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => toggleScope(s.label)}
                  >
                    <td className="py-2 font-semibold">
                      <span className="text-[10px] text-[#999] mr-1.5 inline-block w-3">{isOpen ? '\u25BC' : '\u25B6'}</span>
                      <span style={{ color: s.color }}>{s.label}</span>
                      <span className="text-[10px] text-[#999] ml-2">{s.sublabel}</span>
                    </td>
                    <td className="py-2 px-3 text-right font-medium text-[#414141]">{formatNumber(s.baseline)} tCO₂e</td>
                    <td className="py-2 px-3 text-right font-medium text-[#414141]">{formatNumber(s.scenario)} tCO₂e</td>
                    <td className={`py-2 px-3 text-right font-semibold ${delta > 0 ? 'text-green-600' : delta < 0 ? 'text-amber-600' : 'text-[#999]'}`}>
                      {delta === 0 ? '-' : `${delta > 0 ? '-' : '+'}${formatNumber(Math.abs(delta))} tCO₂e (${Math.abs(pct).toFixed(1)}%)`}
                    </td>
                  </tr>

                  {/* Expanded: individual line items */}
                  {isOpen && lineItems.map((item, i) => {
                    const d = item.baseline - item.scenario
                    return (
                      <tr key={i} className="border-b border-gray-50 bg-[#fafafa]">
                        <td className="py-1.5 pl-8 text-[#888] text-xs">{item.name}</td>
                        <td className="py-1.5 px-3 text-right text-xs text-[#414141]">{formatNumber(item.baseline, 1)} tCO₂e</td>
                        <td className="py-1.5 px-3 text-right text-xs text-[#414141]">{formatNumber(item.scenario, 1)} tCO₂e</td>
                        <td className={`py-1.5 px-3 text-right text-xs font-medium ${d > 0 ? 'text-green-600' : d < 0 ? 'text-amber-600' : 'text-[#999]'}`}>
                          {Math.abs(d) < 0.05 ? '-' : `${d > 0 ? '-' : '+'}${formatNumber(Math.abs(d), 1)} tCO₂e`}
                        </td>
                      </tr>
                    )
                  })}
                </React.Fragment>
              )
            })}

            {/* Total row */}
            <tr className="border-t border-gray-200 font-semibold">
              <td className="py-2 text-[#414141]">Total</td>
              <td className="py-2 px-3 text-right text-[#414141]">{formatNumber(baselineTotal)} tCO₂e</td>
              <td className="py-2 px-3 text-right text-[#414141]">{formatNumber(scenarioTotal)} tCO₂e</td>
              <td className={`py-2 px-3 text-right ${totalDelta > 0 ? 'text-green-600' : totalDelta < 0 ? 'text-amber-600' : 'text-[#999]'}`}>
                {totalDelta === 0 ? '-' : `${totalDelta > 0 ? '-' : '+'}${formatNumber(Math.abs(totalDelta))} tCO₂e (${Math.abs(totalPct).toFixed(1)}%)`}
              </td>
            </tr>
          </tbody>
        </table>
        <div className="text-[10px] text-[#999] mt-1 text-right">All values in tCO₂e/year</div>
      </div>
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
          label="CO₂ Change"
          value={`${formatNumber(Math.abs(totals.co2_tons_saved))} t`}
          subtext={
            totals.co2_tons_saved >= 0
              ? `${totals.co2_reduction_percent.toFixed(1)}% reduction`
              : `${Math.abs(totals.co2_reduction_percent).toFixed(1)}% increase`
          }
          icon="/Icons/Icons/Sustainability/Decarbonization.svg"
          success={totals.co2_tons_saved >= 0}
          danger={totals.co2_tons_saved < 0}
        />
        <SummaryCard
          label="Diesel Change"
          value={`${formatNumber(Math.abs(totals.diesel_liters_saved))} L`}
          subtext={totals.diesel_liters_saved >= 0 ? 'annual litres avoided' : 'annual litres increase'}
          icon="/Icons/Icons/Energy & Fuels/Fuel.svg"
          success={totals.diesel_liters_saved >= 0}
          danger={totals.diesel_liters_saved < 0}
        />
        <SummaryCard
          label="Annual OPEX Change"
          value={
            totals.annual_opex_savings_usd >= 0
              ? formatCurrency(totals.annual_opex_savings_usd)
              : formatCurrency(Math.abs(totals.annual_opex_savings_usd))
          }
          subtext={
            totals.annual_opex_savings_usd >= 0
              ? 'annual savings'
              : 'annual cost increase'
          }
          icon="/Icons/Icons/Business/Investment.svg"
          danger={totals.annual_opex_savings_usd < 0}
          success={totals.annual_opex_savings_usd >= 0}
        />
        <SummaryCard
          label="Simple Payback"
          value={totals.simple_payback_years ? `${totals.simple_payback_years.toFixed(1)} years` : 'N/A'}
          subtext="investment recovery"
          icon="/Icons/Icons/Business/Calendar.svg"
        />
      </div>

      {/* Emissions by Scope */}
      {totals.scenario_emissions && (
        <ScopeEmissionsCard
          baseline={totals.baseline_emissions}
          scenario={totals.scenario_emissions}
          gridEf={result.economic_assumptions_used?.['grid_ef'] ?? 0.4}
          result={result}
        />
      )}

      {/* CAPEX breakdown */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-[11px] font-bold uppercase tracking-widest text-[#8c8c8c] mb-4">
          CAPEX Breakdown
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
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
            <div className="text-[10px] text-[#8c8c8c]">DC Infrastructure</div>
            <div className="text-lg font-semibold text-[#414141]">{formatCurrency(totals.dc_capex_usd)}</div>
          </div>
          <div>
            <div className="text-[10px] text-[#8c8c8c]">Grid</div>
            <div className="text-lg font-semibold text-[#414141]">{formatCurrency(totals.grid_capex_usd)}</div>
          </div>
          <div>
            <div className="text-[10px] text-[#8c8c8c]">Port Services</div>
            <div className="text-lg font-semibold text-[#414141]">{formatCurrency(totals.port_services_capex_usd)}</div>
          </div>
          <div className="bg-[#fafafa] rounded-lg p-3 -m-1">
            <div className="text-[10px] text-[#3c5e86] font-bold">TOTAL CAPEX</div>
            <div className="text-xl font-semibold text-[#3c5e86]">{formatCurrency(totals.total_capex_usd)}</div>
          </div>
        </div>
      </div>

      {/* Investment by Ownership */}
      {totals.ownership_capex && (
        <OwnershipBreakdownCard totals={totals} />
      )}

      {/* Baseline vs Scenario comparison */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[#f5f3f0] rounded-xl p-5">
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-[#7a7267] mb-4">
            Baseline (Current Fleet)
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[#7a7267]">Diesel:</span>
              <span className="text-[#414141] font-semibold">{formatNumber(totals.baseline_diesel_liters)} L/year</span>
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
            {totals.baseline_emissions && (
              <div className="border-t border-[#d4cfc8] pt-2 mt-2 space-y-1">
                <div className="text-[10px] font-bold text-[#7a7267] uppercase">Scope Breakdown</div>
                <div className="flex justify-between text-xs">
                  <span className="text-[#7a7267]">Scope 1 (diesel):</span>
                  <span className="text-[#414141]">{formatNumber(totals.baseline_emissions.scope_1_tons)} tCO₂e</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-[#7a7267]">Scope 2 (electric):</span>
                  <span className="text-[#414141]">{formatNumber(totals.baseline_emissions.scope_2_tons)} tCO₂e</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-[#7a7267]">Scope 3 (3rd party):</span>
                  <span className="text-[#414141]">{formatNumber(totals.baseline_emissions.scope_3_tons)} tCO₂e</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-[#edf5fb] rounded-xl p-5">
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-[#3c5e86] mb-4">
            Scenario (Electrified)
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[#5a8ab5]">Diesel:</span>
              <span className="text-[#414141] font-semibold">{formatNumber(totals.scenario_diesel_liters)} L/year</span>
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
            {totals.scenario_emissions && (
              <div className="border-t border-[#b8daf0] pt-2 mt-2 space-y-1">
                <div className="text-[10px] font-bold text-[#5a8ab5] uppercase">Scope Breakdown</div>
                <div className="flex justify-between text-xs">
                  <span className="text-[#5a8ab5]">Scope 1 (diesel):</span>
                  <span className="text-[#414141]">{formatNumber(totals.scenario_emissions.scope_1_tons)} tCO₂e</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-[#5a8ab5]">Scope 2 (electric):</span>
                  <span className="text-[#414141]">{formatNumber(totals.scenario_emissions.scope_2_tons)} tCO₂e</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-[#5a8ab5]">Scope 3 (3rd party):</span>
                  <span className="text-[#414141]">{formatNumber(totals.scenario_emissions.scope_3_tons)} tCO₂e</span>
                </div>
              </div>
            )}
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

// ── Ownership Breakdown Card with collapsible detail rows ──

const CATEGORY_LABELS: { key: keyof OwnershipBreakdown; label: string }[] = [
  { key: 'equipment', label: 'Equipment' },
  { key: 'chargers', label: 'Chargers' },
  { key: 'ops', label: 'OPS Infrastructure' },
  { key: 'dc', label: 'DC Infrastructure' },
  { key: 'grid', label: 'Grid' },
  { key: 'port_services', label: 'Port Services' },
]

function OwnershipBreakdownCard({ totals }: { totals: PiecePortResult['totals'] }) {
  const [capexOpen, setCapexOpen] = useState(false)
  const [blOpexOpen, setBlOpexOpen] = useState(false)
  const [scOpexOpen, setScOpexOpen] = useState(false)

  const capexDetail = totals.ownership_capex_detail
  const blDetail = totals.ownership_opex_baseline_detail
  const scDetail = totals.ownership_opex_scenario_detail

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-[11px] font-bold uppercase tracking-widest text-[#8c8c8c] mb-4">
        Investment by Ownership
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-2 text-[10px] font-bold uppercase text-[#8c8c8c]"></th>
              <th className="text-right py-2 px-3 text-[10px] font-bold uppercase text-[#3c5e86]">Port-Owned</th>
              <th className="text-right py-2 px-3 text-[10px] font-bold uppercase text-[#8c6d3c]">Third-Party</th>
              <th className="text-right py-2 px-3 text-[10px] font-bold uppercase text-[#414141]">Total</th>
            </tr>
          </thead>
          <tbody>
            {/* ── CAPEX ── */}
            <tr
              className="border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => setCapexOpen(!capexOpen)}
            >
              <td className="py-2 text-[#585858] font-semibold">
                <span className="text-[10px] text-[#999] mr-1.5 inline-block w-3">{capexOpen ? '\u25BC' : '\u25B6'}</span>
                Total CAPEX
              </td>
              <td className="py-2 px-3 text-right text-[#3c5e86] font-medium">{formatCurrency(totals.ownership_capex.port_owned)}</td>
              <td className="py-2 px-3 text-right text-[#8c6d3c] font-medium">{formatCurrency(totals.ownership_capex.third_party)}</td>
              <td className="py-2 px-3 text-right text-[#414141] font-semibold">{formatCurrency(totals.total_capex_usd)}</td>
            </tr>
            {capexOpen && capexDetail && CATEGORY_LABELS.map(({ key, label }) => {
              const cat = capexDetail[key]
              const total = cat.port_owned + cat.third_party
              if (total === 0) return null
              return (
                <tr key={key} className="border-b border-gray-50 bg-[#fafafa]">
                  <td className="py-1.5 pl-8 text-[#888] text-xs">{label}</td>
                  <td className="py-1.5 px-3 text-right text-[#3c5e86] text-xs">{formatCurrency(cat.port_owned)}</td>
                  <td className="py-1.5 px-3 text-right text-[#8c6d3c] text-xs">{formatCurrency(cat.third_party)}</td>
                  <td className="py-1.5 px-3 text-right text-[#666] text-xs">{formatCurrency(total)}</td>
                </tr>
              )
            })}

            {/* ── Baseline OPEX ── */}
            <tr
              className="border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => setBlOpexOpen(!blOpexOpen)}
            >
              <td className="py-2 text-[#585858] font-semibold">
                <span className="text-[10px] text-[#999] mr-1.5 inline-block w-3">{blOpexOpen ? '\u25BC' : '\u25B6'}</span>
                Baseline OPEX
              </td>
              <td className="py-2 px-3 text-right text-[#3c5e86] font-medium">{formatCurrency(totals.ownership_opex_baseline.port_owned)}/yr</td>
              <td className="py-2 px-3 text-right text-[#8c6d3c] font-medium">{formatCurrency(totals.ownership_opex_baseline.third_party)}/yr</td>
              <td className="py-2 px-3 text-right text-[#414141] font-semibold">{formatCurrency(totals.baseline_opex_usd)}/yr</td>
            </tr>
            {blOpexOpen && blDetail && CATEGORY_LABELS.map(({ key, label }) => {
              const cat = blDetail[key]
              const total = cat.port_owned + cat.third_party
              if (total === 0) return null
              return (
                <tr key={key} className="border-b border-gray-50 bg-[#fafafa]">
                  <td className="py-1.5 pl-8 text-[#888] text-xs">{label}</td>
                  <td className="py-1.5 px-3 text-right text-[#3c5e86] text-xs">{formatCurrency(cat.port_owned)}/yr</td>
                  <td className="py-1.5 px-3 text-right text-[#8c6d3c] text-xs">{formatCurrency(cat.third_party)}/yr</td>
                  <td className="py-1.5 px-3 text-right text-[#666] text-xs">{formatCurrency(total)}/yr</td>
                </tr>
              )
            })}

            {/* ── Scenario OPEX ── */}
            <tr
              className="border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => setScOpexOpen(!scOpexOpen)}
            >
              <td className="py-2 text-[#585858] font-semibold">
                <span className="text-[10px] text-[#999] mr-1.5 inline-block w-3">{scOpexOpen ? '\u25BC' : '\u25B6'}</span>
                Scenario OPEX
              </td>
              <td className="py-2 px-3 text-right text-[#3c5e86] font-medium">{formatCurrency(totals.ownership_opex_scenario.port_owned)}/yr</td>
              <td className="py-2 px-3 text-right text-[#8c6d3c] font-medium">{formatCurrency(totals.ownership_opex_scenario.third_party)}/yr</td>
              <td className="py-2 px-3 text-right text-[#414141] font-semibold">{formatCurrency(totals.scenario_opex_usd)}/yr</td>
            </tr>
            {scOpexOpen && scDetail && CATEGORY_LABELS.map(({ key, label }) => {
              const cat = scDetail[key]
              const total = cat.port_owned + cat.third_party
              if (total === 0) return null
              return (
                <tr key={key} className="border-b border-gray-50 bg-[#fafafa]">
                  <td className="py-1.5 pl-8 text-[#888] text-xs">{label}</td>
                  <td className="py-1.5 px-3 text-right text-[#3c5e86] text-xs">{formatCurrency(cat.port_owned)}/yr</td>
                  <td className="py-1.5 px-3 text-right text-[#8c6d3c] text-xs">{formatCurrency(cat.third_party)}/yr</td>
                  <td className="py-1.5 px-3 text-right text-[#666] text-xs">{formatCurrency(total)}/yr</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
