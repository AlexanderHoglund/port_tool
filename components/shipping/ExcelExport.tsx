'use client'

import * as XLSX from 'xlsx'
import type { PortResult, TerminalResult } from '@/lib/types'
import { EQUIPMENT } from '@/lib/constants'

/**
 * Generates a 4-sheet Excel workbook from calculation results.
 *
 * Sheet 1: Executive Summary — port info + aggregated baseline vs scenario + delta
 * Sheet 2: Terminal Details — per-terminal baseline vs scenario comparison
 * Sheet 3: Onshore Equipment — full equipment breakdown per terminal
 * Sheet 4: Offshore Analysis — vessel berth + tug comparison per terminal
 */
export function exportToExcel(result: PortResult) {
  const wb = XLSX.utils.book_new()
  const { port, terminals, totals } = result
  const date = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  // ── Sheet 1: Executive Summary ─────────────────────────
  const sumRows: (string | number | null)[][] = [
    ['PORT ENERGY TRANSITION — EXECUTIVE SUMMARY'],
    [],
    ['Port Name', port.name || '—'],
    ['Location', port.location || '—'],
    ['Port Size', port.size_key || '—'],
    ['Terminals', terminals.length],
    ['Report Date', date],
    [],
    ['AGGREGATED COMPARISON'],
    ['Metric', 'Baseline', 'Scenario', 'Delta'],
    [
      'Annual Diesel (litres)',
      Math.round(totals.baseline_diesel_liters),
      Math.round(totals.scenario_diesel_liters),
      -Math.round(totals.delta.diesel_liters_saved),
    ],
    [
      'Annual Electricity (kWh)',
      Math.round(totals.baseline_electricity_kwh),
      Math.round(totals.scenario_electricity_kwh),
      Math.round(totals.delta.electricity_kwh_delta),
    ],
    [
      'Annual CO2 (tons)',
      Math.round(totals.baseline_co2_tons * 10) / 10,
      Math.round(totals.scenario_co2_tons * 10) / 10,
      -Math.round(totals.delta.co2_tons_saved * 10) / 10,
    ],
    [
      'Annual OPEX (USD)',
      Math.round(totals.baseline_total_opex_usd),
      Math.round(totals.scenario_total_opex_usd),
      Math.round(totals.delta.annual_opex_delta_usd),
    ],
    [],
    ['INVESTMENT METRICS'],
    ['Total CAPEX Required (USD)', Math.round(totals.total_capex_usd)],
    [
      'Simple Payback (years)',
      totals.delta.simple_payback_years !== null
        ? Math.round(totals.delta.simple_payback_years * 10) / 10
        : 'N/A',
    ],
    [
      'CO2 Reduction (%)',
      totals.baseline_co2_tons > 0
        ? Math.round(
            (totals.delta.co2_tons_saved / totals.baseline_co2_tons) * 1000,
          ) / 10
        : 0,
    ],
  ]

  const wsSummary = XLSX.utils.aoa_to_sheet(sumRows)
  wsSummary['!cols'] = [
    { wch: 30 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
  ]
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Executive Summary')

  // ── Sheet 2: Terminal Details ──────────────────────────
  const termRows: (string | number | null)[][] = [
    ['TERMINAL-LEVEL COMPARISON'],
    [],
    [
      'Terminal',
      'Onshore Baseline Diesel (L)',
      'Onshore Baseline kWh',
      'Onshore Baseline CO2 (t)',
      'Onshore Baseline OPEX (USD)',
      'Onshore Scenario Diesel (L)',
      'Onshore Scenario kWh',
      'Onshore Scenario CO2 (t)',
      'Onshore Scenario OPEX (USD)',
      'Offshore Baseline Diesel (L)',
      'Offshore Baseline CO2 (t)',
      'Offshore Baseline Cost (USD)',
      'Offshore Scenario Diesel (L)',
      'Offshore Scenario CO2 (t)',
      'Offshore Scenario Cost (USD)',
      'Shore Power kWh',
      'Scenario CAPEX (USD)',
    ],
  ]

  for (const t of terminals) {
    termRows.push([
      t.terminal_name,
      Math.round(t.onshore_baseline.annual_diesel_liters),
      Math.round(t.onshore_baseline.annual_electricity_kwh),
      Math.round(t.onshore_baseline.annual_co2_tons * 10) / 10,
      Math.round(t.onshore_baseline.annual_total_opex_usd),
      Math.round(t.onshore_scenario.annual_diesel_liters),
      Math.round(t.onshore_scenario.annual_electricity_kwh),
      Math.round(t.onshore_scenario.annual_co2_tons * 10) / 10,
      Math.round(t.onshore_scenario.annual_total_opex_usd),
      Math.round(t.offshore_baseline.total_diesel_liters),
      Math.round(t.offshore_baseline.total_co2_tons * 10) / 10,
      Math.round(t.offshore_baseline.total_cost_usd),
      Math.round(t.offshore_scenario.total_diesel_liters),
      Math.round(t.offshore_scenario.total_co2_tons * 10) / 10,
      Math.round(t.offshore_scenario.total_cost_usd),
      Math.round(t.offshore_scenario.shore_power_kwh),
      Math.round(t.scenario_capex_usd),
    ])
  }

  const wsTerminals = XLSX.utils.aoa_to_sheet(termRows)
  wsTerminals['!cols'] = Array(17).fill({ wch: 22 })
  XLSX.utils.book_append_sheet(wb, wsTerminals, 'Terminal Details')

  // ── Sheet 3: Onshore Equipment ─────────────────────────
  const eqRows: (string | number | null)[][] = [
    ['ONSHORE EQUIPMENT BREAKDOWN'],
    [],
    [
      'Terminal',
      'Equipment',
      'Type',
      'Scenario',
      'Qty',
      'Diesel (L)',
      'Electricity (kWh)',
      'CO2 (tons)',
      'Fuel Cost (USD)',
      'Energy Cost (USD)',
      'Maintenance (USD)',
      'Total OPEX (USD)',
      'CAPEX (USD)',
    ],
  ]

  for (const t of terminals) {
    // Baseline detail
    for (const item of t.baseline_equipment_detail) {
      if (item.quantity === 0) continue
      eqRows.push([
        t.terminal_name,
        item.display_name,
        item.equipment_type,
        'Baseline',
        item.quantity,
        Math.round(item.annual_diesel_liters),
        Math.round(item.annual_electricity_kwh),
        Math.round(item.annual_co2_tons * 10) / 10,
        Math.round(item.annual_fuel_cost_usd),
        Math.round(item.annual_energy_cost_usd),
        Math.round(item.annual_maintenance_usd),
        Math.round(item.annual_total_opex_usd),
        null,
      ])
    }
    // Scenario detail
    for (const item of t.scenario_equipment_detail) {
      if (item.quantity === 0) continue
      eqRows.push([
        t.terminal_name,
        item.display_name,
        item.equipment_type,
        'Scenario',
        item.quantity,
        Math.round(item.annual_diesel_liters),
        Math.round(item.annual_electricity_kwh),
        Math.round(item.annual_co2_tons * 10) / 10,
        Math.round(item.annual_fuel_cost_usd),
        Math.round(item.annual_energy_cost_usd),
        Math.round(item.annual_maintenance_usd),
        Math.round(item.annual_total_opex_usd),
        Math.round(item.total_capex_usd ?? 0),
      ])
    }
  }

  const wsEquipment = XLSX.utils.aoa_to_sheet(eqRows)
  wsEquipment['!cols'] = [
    { wch: 20 },
    { wch: 34 },
    { wch: 20 },
    { wch: 12 },
    { wch: 8 },
    { wch: 14 },
    { wch: 16 },
    { wch: 12 },
    { wch: 14 },
    { wch: 14 },
    { wch: 16 },
    { wch: 14 },
    { wch: 14 },
  ]
  XLSX.utils.book_append_sheet(wb, wsEquipment, 'Onshore Equipment')

  // ── Sheet 4: Offshore Analysis ─────────────────────────
  const offRows: (string | number | null)[][] = [
    ['OFFSHORE ANALYSIS'],
    [],
    [
      'Terminal',
      'Metric',
      'Baseline',
      'Scenario',
    ],
  ]

  for (const t of terminals) {
    const ob = t.offshore_baseline
    const os = t.offshore_scenario

    offRows.push(
      [t.terminal_name, 'Vessel Diesel (L)', Math.round(ob.vessel_diesel_liters), Math.round(os.vessel_diesel_liters)],
      [t.terminal_name, 'Vessel CO2 (t)', Math.round(ob.vessel_co2_tons * 10) / 10, Math.round(os.vessel_co2_tons * 10) / 10],
      [t.terminal_name, 'Vessel Fuel Cost (USD)', Math.round(ob.vessel_fuel_cost_usd), Math.round(os.vessel_fuel_cost_usd)],
      [t.terminal_name, 'Shore Power (kWh)', 0, Math.round(os.shore_power_kwh)],
      [t.terminal_name, 'Shore Power Cost (USD)', 0, Math.round(os.shore_power_cost_usd)],
      [t.terminal_name, 'Shore Power CO2 (t)', 0, Math.round(os.shore_power_co2_tons * 10) / 10],
      [t.terminal_name, 'Tug Diesel (L)', Math.round(ob.tug_diesel_liters), Math.round(os.tug_diesel_liters)],
      [t.terminal_name, 'Tug Electricity (kWh)', Math.round(ob.tug_electricity_kwh), Math.round(os.tug_electricity_kwh)],
      [t.terminal_name, 'Tug CO2 (t)', Math.round(ob.tug_co2_tons * 10) / 10, Math.round(os.tug_co2_tons * 10) / 10],
      [t.terminal_name, 'Tug Fuel Cost (USD)', Math.round(ob.tug_fuel_cost_usd), Math.round(os.tug_fuel_cost_usd)],
      [t.terminal_name, 'Tug CAPEX (USD)', Math.round(ob.tug_capex_usd), Math.round(os.tug_capex_usd)],
      [t.terminal_name, 'Total Diesel (L)', Math.round(ob.total_diesel_liters), Math.round(os.total_diesel_liters)],
      [t.terminal_name, 'Total CO2 (t)', Math.round(ob.total_co2_tons * 10) / 10, Math.round(os.total_co2_tons * 10) / 10],
      [t.terminal_name, 'Total Cost (USD)', Math.round(ob.total_cost_usd), Math.round(os.total_cost_usd)],
      [], // blank row between terminals
    )
  }

  const wsOffshore = XLSX.utils.aoa_to_sheet(offRows)
  wsOffshore['!cols'] = [
    { wch: 20 },
    { wch: 24 },
    { wch: 18 },
    { wch: 18 },
  ]
  XLSX.utils.book_append_sheet(wb, wsOffshore, 'Offshore Analysis')

  // ── Save ───────────────────────────────────────────────
  const filename = port.name
    ? `${port.name.replace(/[^a-zA-Z0-9]/g, '_')}_Energy_Transition.xlsx`
    : 'Energy_Transition_Report.xlsx'

  XLSX.writeFile(wb, filename)
}
