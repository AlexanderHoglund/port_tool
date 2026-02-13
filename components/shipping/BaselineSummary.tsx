'use client'

import { useState } from 'react'
import type { ProjectBaseline, PieceTerminalConfig, PortServicesBaseline } from '@/lib/types'

type Props = {
  baseline: ProjectBaseline
  terminals: PieceTerminalConfig[]
  portServicesBaseline?: PortServicesBaseline | null
}

const SEGMENT_LABELS: Record<string, string> = {
  container_0_3k: '0–3K TEU',
  container_3_6k: '3–6K TEU',
  container_6_10k: '6–10K TEU',
  container_10k_plus: '10K+ TEU',
  cruise_0_25k: '0–25K GT',
  cruise_25_100k: '25–100K GT',
  cruise_100_175k: '100–175K GT',
  cruise_175k_plus: '175K+ GT',
  roro_0_4k: '0–4K CEU',
  roro_4_7k: '4–7K CEU',
  roro_7k_plus: '7K+ CEU',
}

const EQUIPMENT_NAMES: Record<string, string> = {
  mhc: 'Mobile Harbor Crane',
  sts: 'Ship-to-Shore Crane',
  rmg: 'Rail Mounted Gantry',
  rtg: 'Rubber Tired Gantry',
  asc: 'Automated Stacking Crane',
  reefer: 'Reefer Connection',
  agv: 'Automated Guided Vehicle',
  tt: 'Terminal Tractor',
  ech: 'Empty Container Handler',
  rs: 'Reach Stacker',
  sc: 'Straddle Carrier',
}

function fmt(n: number): string {
  return n.toLocaleString()
}

function TerminalDetail({ terminal }: { terminal: PieceTerminalConfig }) {
  const [open, setOpen] = useState(false)

  const typeLabel = terminal.terminal_type === 'container' ? 'Container'
    : terminal.terminal_type === 'cruise' ? 'Cruise' : 'RoRo'

  const throughputLabel = terminal.terminal_type === 'container' ? 'TEU'
    : terminal.terminal_type === 'cruise' ? 'passengers' : 'CEU'

  const totalDiesel = Object.values(terminal.baseline_equipment).reduce(
    (s, e) => s + (e?.existing_diesel || 0), 0
  )
  const totalElectric = Object.values(terminal.baseline_equipment).reduce(
    (s, e) => s + (e?.existing_electric || 0), 0
  )

  const bl = terminal.buildings_lighting
  const hasBuildings = bl && (bl.warehouse_sqm + bl.office_sqm + bl.workshop_sqm > 0 || bl.high_mast_lights + bl.area_lights + bl.roadway_lights > 0)

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-3.5 bg-[#f8f8f8] cursor-pointer hover:bg-[#f2f2f2] transition-colors"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-[#8c8c8c]">{open ? '\u25BC' : '\u25B6'}</span>
          <span className="text-sm font-semibold text-[#414141]">{terminal.name}</span>
          <span className="px-2 py-0.5 rounded bg-[#e8f0f8] text-[10px] font-semibold text-[#3c5e86] uppercase">
            {typeLabel}
          </span>
        </div>
        <div className="flex items-center gap-5 text-xs text-[#8c8c8c]">
          <span>{fmt(terminal.annual_teu)} {throughputLabel}</span>
          <span>{terminal.berths.length} berth{terminal.berths.length !== 1 ? 's' : ''}</span>
          <span>{totalDiesel + totalElectric} equipment</span>
          {totalElectric > 0 && (
            <span className="text-[#286464]">{totalElectric} electric</span>
          )}
        </div>
      </div>

      {/* Expanded detail */}
      {open && (
        <div className="px-5 py-4 space-y-5">
          {/* Berths */}
          {terminal.berths.length > 0 && (
            <div>
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#8c8c8c] mb-2">
                Berths ({terminal.berths.length})
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-1.5 text-[10px] font-bold text-[#8c8c8c]">Berth</th>
                      <th className="text-left py-1.5 text-[10px] font-bold text-[#8c8c8c]">Max Vessel</th>
                      <th className="text-center py-1.5 text-[10px] font-bold text-[#8c8c8c]">OPS</th>
                      <th className="text-center py-1.5 text-[10px] font-bold text-[#8c8c8c]">DC</th>
                    </tr>
                  </thead>
                  <tbody>
                    {terminal.berths.map((b) => (
                      <tr key={b.id} className="border-b border-gray-100">
                        <td className="py-1.5 text-[#414141] font-medium">{b.berth_name || `Berth ${b.berth_number}`}</td>
                        <td className="py-1.5 text-[#585858]">
                          {SEGMENT_LABELS[b.max_vessel_segment_key] || b.max_vessel_segment_key}
                        </td>
                        <td className="py-1.5 text-center">{b.ops_existing ? '\u2713' : '-'}</td>
                        <td className="py-1.5 text-center">{b.dc_existing ? '\u2713' : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Operations */}
          {((terminal.vessel_calls ?? []).length > 0 || terminal.annual_teu > 0) && (
            <div>
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#8c8c8c] mb-2">
                Operations
              </h4>
              <div className="flex items-center gap-6 text-sm mb-2">
                <div>
                  <span className="text-[#8c8c8c] text-xs">Throughput</span>
                  <div className="text-[#414141] font-medium">{fmt(terminal.annual_teu)} {throughputLabel}/yr</div>
                </div>
                <div>
                  <span className="text-[#8c8c8c] text-xs">Total Calls</span>
                  <div className="text-[#414141] font-medium">
                    {fmt((terminal.vessel_calls ?? []).reduce((s, c) => s + c.annual_calls, 0))}/yr
                  </div>
                </div>
              </div>
              {(terminal.vessel_calls ?? []).length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-1.5 text-[10px] font-bold text-[#8c8c8c]">Vessel Type</th>
                        <th className="text-center py-1.5 text-[10px] font-bold text-[#8c8c8c]">Calls/Year</th>
                        <th className="text-center py-1.5 text-[10px] font-bold text-[#8c8c8c]">Avg Hours</th>
                        <th className="text-center py-1.5 text-[10px] font-bold text-[#8c8c8c]">Annual Hours</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(terminal.vessel_calls ?? []).map((vc) => (
                        <tr key={vc.id} className="border-b border-gray-100">
                          <td className="py-1.5 text-[#414141]">
                            {SEGMENT_LABELS[vc.vessel_segment_key] || vc.vessel_segment_key}
                          </td>
                          <td className="py-1.5 text-center text-[#585858]">{fmt(vc.annual_calls)}</td>
                          <td className="py-1.5 text-center text-[#585858]">{vc.avg_berth_hours}h</td>
                          <td className="py-1.5 text-center text-[#585858]">{fmt(vc.annual_calls * vc.avg_berth_hours)}h</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Equipment */}
          {Object.keys(terminal.baseline_equipment).length > 0 && (
            <div>
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#8c8c8c] mb-2">
                Onshore Equipment
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-1.5 text-[10px] font-bold text-[#8c8c8c]">Equipment</th>
                      <th className="text-center py-1.5 text-[10px] font-bold text-[#8c8c8c]">Diesel</th>
                      <th className="text-center py-1.5 text-[10px] font-bold text-[#8c8c8c]">Electric</th>
                      <th className="text-center py-1.5 text-[10px] font-bold text-[#8c8c8c]">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(terminal.baseline_equipment)
                      .filter(([, e]) => (e?.existing_diesel || 0) + (e?.existing_electric || 0) > 0)
                      .map(([key, e]) => (
                        <tr key={key} className="border-b border-gray-100">
                          <td className="py-1.5 text-[#414141]">{EQUIPMENT_NAMES[key] || key}</td>
                          <td className="py-1.5 text-center text-[#585858]">{e.existing_diesel || 0}</td>
                          <td className="py-1.5 text-center text-[#286464]">{e.existing_electric || 0}</td>
                          <td className="py-1.5 text-center font-medium text-[#414141]">
                            {(e.existing_diesel || 0) + (e.existing_electric || 0)}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                  <tfoot>
                    <tr className="font-semibold">
                      <td className="py-1.5 text-[#414141]">Total</td>
                      <td className="py-1.5 text-center text-[#585858]">{totalDiesel}</td>
                      <td className="py-1.5 text-center text-[#286464]">{totalElectric}</td>
                      <td className="py-1.5 text-center text-[#414141]">{totalDiesel + totalElectric}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* Buildings & Lighting */}
          {hasBuildings && bl && (
            <div>
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#8c8c8c] mb-2">
                Buildings & Lighting
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                {bl.warehouse_sqm > 0 && (
                  <div>
                    <span className="text-[#8c8c8c] text-xs">Warehouse</span>
                    <div className="text-[#414141] font-medium">{fmt(bl.warehouse_sqm)} m²</div>
                  </div>
                )}
                {bl.office_sqm > 0 && (
                  <div>
                    <span className="text-[#8c8c8c] text-xs">Office</span>
                    <div className="text-[#414141] font-medium">{fmt(bl.office_sqm)} m²</div>
                  </div>
                )}
                {bl.workshop_sqm > 0 && (
                  <div>
                    <span className="text-[#8c8c8c] text-xs">Workshop</span>
                    <div className="text-[#414141] font-medium">{fmt(bl.workshop_sqm)} m²</div>
                  </div>
                )}
                {bl.high_mast_lights > 0 && (
                  <div>
                    <span className="text-[#8c8c8c] text-xs">High Mast Lights</span>
                    <div className="text-[#414141] font-medium">{bl.high_mast_lights}</div>
                  </div>
                )}
                {bl.area_lights > 0 && (
                  <div>
                    <span className="text-[#8c8c8c] text-xs">Area Lights</span>
                    <div className="text-[#414141] font-medium">{bl.area_lights}</div>
                  </div>
                )}
                {bl.roadway_lights > 0 && (
                  <div>
                    <span className="text-[#8c8c8c] text-xs">Roadway Lights</span>
                    <div className="text-[#414141] font-medium">{bl.roadway_lights}</div>
                  </div>
                )}
                {bl.annual_operating_hours > 0 && bl.annual_operating_hours !== 8760 && (
                  <div>
                    <span className="text-[#8c8c8c] text-xs">Operating Hours</span>
                    <div className="text-[#414141] font-medium">{fmt(bl.annual_operating_hours)} h/year</div>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  )
}

export default function BaselineSummary({ terminals, portServicesBaseline }: Props) {
  return (
    <div className="space-y-5">
      {/* Terminal Details */}
      <div>
        <div className="text-[11px] font-bold uppercase tracking-widest text-[#8c8c8c] mb-3">
          Terminals ({terminals.length})
        </div>
        <div className="space-y-3">
          {terminals.map((t) => (
            <TerminalDetail key={t.id} terminal={t} />
          ))}
        </div>
      </div>

      {/* Offshore Equipment (Port-Wide) */}
      {portServicesBaseline && (
        portServicesBaseline.tugs_diesel + portServicesBaseline.tugs_electric +
        portServicesBaseline.pilot_boats_diesel + portServicesBaseline.pilot_boats_electric > 0
      ) && (
        <div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-[#8c8c8c] mb-3">
            Offshore Equipment
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              {(portServicesBaseline.tugs_diesel > 0 || portServicesBaseline.tugs_electric > 0) && (
                <>
                  <div>
                    <span className="text-[#8c8c8c] text-xs">Tugs (Diesel)</span>
                    <div className="text-[#414141] font-medium">{portServicesBaseline.tugs_diesel}</div>
                  </div>
                  <div>
                    <span className="text-[#8c8c8c] text-xs">Tugs (Electric)</span>
                    <div className="text-[#286464] font-medium">{portServicesBaseline.tugs_electric}</div>
                  </div>
                </>
              )}
              {(portServicesBaseline.pilot_boats_diesel > 0 || portServicesBaseline.pilot_boats_electric > 0) && (
                <>
                  <div>
                    <span className="text-[#8c8c8c] text-xs">Pilot Boats (Diesel)</span>
                    <div className="text-[#414141] font-medium">{portServicesBaseline.pilot_boats_diesel}</div>
                  </div>
                  <div>
                    <span className="text-[#8c8c8c] text-xs">Pilot Boats (Electric)</span>
                    <div className="text-[#286464] font-medium">{portServicesBaseline.pilot_boats_electric}</div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
