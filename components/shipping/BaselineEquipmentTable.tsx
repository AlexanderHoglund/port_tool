'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import type { TerminalType, BaselineEquipmentEntry } from '@/lib/types'
import { createClient } from '@/utils/supabase/client'
import { usePieceContext } from '@/app/piece/context/PieceContext'

// PROFILE_NAME is now derived from context inside components

type Props = {
  terminalType: TerminalType
  equipment: Record<string, BaselineEquipmentEntry>
  onChange: (updated: Record<string, BaselineEquipmentEntry>) => void
}

// Structural metadata (DB is source of truth for numeric values)
type EquipmentMeta = {
  key: string
  name: string
  category: 'grid_powered' | 'mobile'
  type: 'quayside' | 'yard' | 'horizontal'
  terminalTypes: TerminalType[]
}

// Numeric specs fetched from DB
type EquipmentSpecs = {
  kwh_per_teu: number
  peak_power_kw: number
  capex_usd: number
  annual_opex_usd: number
}

// Defaults from DB (before overrides)
type SpecDefaults = {
  kwh_per_teu: number
  peak_power_kw: number
  capex_usd: number
  annual_opex_usd: number
}

const PIECE_EQUIPMENT: EquipmentMeta[] = [
  // Grid-powered equipment (always electric, no diesel option)
  { key: 'mhc', name: 'Mobile Harbor Crane', category: 'grid_powered', type: 'quayside', terminalTypes: ['container'] },
  { key: 'sts', name: 'Ship-to-Shore Crane', category: 'grid_powered', type: 'quayside', terminalTypes: ['container'] },
  { key: 'rmg', name: 'Rail Mounted Gantry', category: 'grid_powered', type: 'yard', terminalTypes: ['container'] },
  { key: 'rtg', name: 'Rubber Tired Gantry', category: 'grid_powered', type: 'yard', terminalTypes: ['container'] },
  { key: 'asc', name: 'Automated Stacking Crane', category: 'grid_powered', type: 'yard', terminalTypes: ['container'] },
  { key: 'reefer', name: 'Reefer Connection', category: 'grid_powered', type: 'yard', terminalTypes: ['container'] },

  // Mobile equipment (can be diesel or electric)
  { key: 'agv', name: 'Automated Guided Vehicle', category: 'mobile', type: 'horizontal', terminalTypes: ['container'] },
  { key: 'tt', name: 'Terminal Tractor', category: 'mobile', type: 'horizontal', terminalTypes: ['container', 'roro'] },
  { key: 'ech', name: 'Empty Container Handler', category: 'mobile', type: 'yard', terminalTypes: ['container'] },
  { key: 'rs', name: 'Reach Stacker', category: 'mobile', type: 'yard', terminalTypes: ['container', 'roro'] },
  { key: 'sc', name: 'Straddle Carrier', category: 'mobile', type: 'yard', terminalTypes: ['container'] },
]

const EQUIPMENT_IMAGES: Record<string, string> = {
  mhc: '/port_images/mobile harbour crane.jpg',
  sts: '/port_images/ship_to_shore.png',
  rmg: '/port_images/Rail Mounted Gantry Crane.jpg',
  rtg: '/port_images/Rubber Tired Gantry Crane.jpg',
  asc: '/port_images/Automated Stacking Crane.jpg',
  reefer: '/port_images/Refrigerated Container Power Supply Units.jpg',
  agv: '/port_images/Automated Guided Vehicle.png',
  tt: '/port_images/Terminal Tractor.png',
  ech: '/port_images/Empty Container Handler.png',
  rs: '/port_images/Reach Stacker.jpg',
  sc: '/port_images/Straddle Carrier.jpg',
}

const CATEGORIES = [
  { key: 'grid_powered', label: 'Grid-Powered Equipment', sublabel: '(always electric)', color: '#4a90b8' },
  { key: 'mobile', label: 'Mobile Equipment', sublabel: '(diesel or electric)', color: '#5ea648' },
] as const

function parseQty(raw: string): number {
  if (raw === '') return 0
  const n = parseInt(raw, 10)
  return isNaN(n) || n < 0 ? 0 : n
}

// Editable spec fields in expanded detail
const EDITABLE_COLUMNS = ['annual_opex_usd', 'kwh_per_teu', 'peak_power_kw'] as const
type EditableColumn = typeof EDITABLE_COLUMNS[number]

function EquipmentRow({
  meta,
  entry,
  specs,
  defaults,
  overrideFlags,
  onChange,
  onSpecChange,
}: {
  meta: EquipmentMeta
  entry: BaselineEquipmentEntry
  specs: EquipmentSpecs
  defaults: SpecDefaults
  overrideFlags: Record<string, boolean>
  onChange: (updated: BaselineEquipmentEntry) => void
  onSpecChange: (column: EditableColumn, value: number) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const isGridPowered = meta.category === 'grid_powered'

  // String state for editable fields (avoids 0-prefix bug)
  const [opexStr, setOpexStr] = useState(String(specs.annual_opex_usd))
  const [kwhStr, setKwhStr] = useState(String(specs.kwh_per_teu))
  const [peakStr, setPeakStr] = useState(String(specs.peak_power_kw))

  // Sync string state when specs change (e.g., from assumption tab sync)
  useEffect(() => {
    setOpexStr(String(specs.annual_opex_usd))
  }, [specs.annual_opex_usd])
  useEffect(() => {
    setKwhStr(String(specs.kwh_per_teu))
  }, [specs.kwh_per_teu])
  useEffect(() => {
    setPeakStr(String(specs.peak_power_kw))
  }, [specs.peak_power_kw])

  const handleOpexBlur = () => {
    const value = parseFloat(opexStr) || 0
    setOpexStr(String(value))
    onSpecChange('annual_opex_usd', value)
  }

  const handleKwhBlur = () => {
    const value = parseFloat(kwhStr) || 0
    setKwhStr(String(value))
    onSpecChange('kwh_per_teu', value)
  }

  const handlePeakBlur = () => {
    const value = parseFloat(peakStr) || 0
    setPeakStr(String(value))
    onSpecChange('peak_power_kw', value)
  }

  const opexHasOverride = overrideFlags[`${meta.key}:annual_opex_usd`] ?? false
  const kwhHasOverride = overrideFlags[`${meta.key}:kwh_per_teu`] ?? false
  const peakHasOverride = overrideFlags[`${meta.key}:peak_power_kw`] ?? false

  return (
    <>
      <tr className="border-b border-gray-100 hover:bg-gray-50/50">
        <td className="py-2 px-3 pl-8">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="text-[10px] text-[#999] hover:text-[#333] w-4"
            >
              {expanded ? '\u25BC' : '\u25B6'}
            </button>
            <span className="text-[13px] text-[#333]">{meta.name}</span>
          </div>
        </td>
        <td className="py-2 px-3 text-center text-xs text-[#777]">{Number(specs.kwh_per_teu).toFixed(1)}</td>
        <td className="py-2 px-3 text-center text-xs text-[#777]">{specs.peak_power_kw}</td>

        {/* Diesel column */}
        <td className="py-2 px-3 bg-[#fef3e8]">
          {isGridPowered ? (
            <div className="text-center text-xs text-[#bbb]">—</div>
          ) : (
            <input
              type="number"
              min={0}
              value={entry.existing_diesel || ''}
              placeholder="0"
              onChange={(e) => onChange({ ...entry, existing_diesel: parseQty(e.target.value) })}
              className="w-full px-2 py-1.5 rounded border border-[#e0c9ad] text-sm text-center text-[#414141] bg-white focus:border-[#c9a87c] focus:outline-none"
            />
          )}
        </td>

        {/* Electric column */}
        <td className="py-2 px-3 bg-[#eaf3fb]">
          <input
            type="number"
            min={0}
            value={entry.existing_electric || ''}
            placeholder="0"
            onChange={(e) => onChange({ ...entry, existing_electric: parseQty(e.target.value) })}
            className="w-full px-2 py-1.5 rounded border border-[#a8cde8] text-sm text-center text-[#414141] bg-white focus:border-[#5a95c0] focus:outline-none"
          />
        </td>

        {/* Total column */}
        <td className="py-2 px-3 text-center text-sm font-semibold text-[#333]">
          {entry.existing_diesel + entry.existing_electric}
        </td>
      </tr>

      {expanded && (
        <tr className="border-b border-gray-100">
          <td colSpan={6} className="p-0">
            <div className="bg-[#f5f5f5] px-8 py-3 text-xs space-y-2">
              <div className="inline-flex gap-6">
                <div className="space-y-2">
                  <div><span className="text-[#777]">Type:</span> <span className="text-[#444]">{meta.type}</span></div>

                  {/* OPEX — editable */}
                  <div className="flex items-center gap-2">
                    <span className="text-[#777] w-16">OPEX:</span>
                    <span className="text-[#777] text-xs">$</span>
                    <input
                      type="number"
                      min={0}
                      step={1000}
                      value={opexStr}
                      onChange={(e) => setOpexStr(e.target.value)}
                      onBlur={handleOpexBlur}
                      className={`w-32 px-2 py-1 rounded border text-xs text-[#414141] focus:outline-none ${
                        opexHasOverride
                          ? 'border-blue-300 bg-blue-50/40 focus:border-blue-500'
                          : 'border-gray-300 bg-white focus:border-[#3c5e86]'
                      }`}
                    />
                    <span className="text-[#888] text-[10px]">USD/unit/year</span>
                    {opexHasOverride && (
                      <span className="text-[10px] text-blue-500 font-medium">custom (default: ${defaults.annual_opex_usd.toLocaleString()} USD)</span>
                    )}
                  </div>

                  {/* kWh/TEU — editable */}
                  <div className="flex items-center gap-2">
                    <span className="text-[#777] w-16">kWh/TEU:</span>
                    <input
                      type="number"
                      min={0}
                      step={0.1}
                      value={kwhStr}
                      onChange={(e) => setKwhStr(e.target.value)}
                      onBlur={handleKwhBlur}
                      className={`w-32 px-2 py-1 rounded border text-xs text-[#414141] focus:outline-none ${
                        kwhHasOverride
                          ? 'border-blue-300 bg-blue-50/40 focus:border-blue-500'
                          : 'border-gray-300 bg-white focus:border-[#3c5e86]'
                      }`}
                    />
                    {kwhHasOverride && (
                      <span className="text-[10px] text-blue-500 font-medium">custom (default: {defaults.kwh_per_teu})</span>
                    )}
                  </div>

                  {/* Peak kW — editable */}
                  <div className="flex items-center gap-2">
                    <span className="text-[#777] w-16">Peak kW:</span>
                    <input
                      type="number"
                      min={0}
                      step={10}
                      value={peakStr}
                      onChange={(e) => setPeakStr(e.target.value)}
                      onBlur={handlePeakBlur}
                      className={`w-32 px-2 py-1 rounded border text-xs text-[#414141] focus:outline-none ${
                        peakHasOverride
                          ? 'border-blue-300 bg-blue-50/40 focus:border-blue-500'
                          : 'border-gray-300 bg-white focus:border-[#3c5e86]'
                      }`}
                    />
                    {peakHasOverride && (
                      <span className="text-[10px] text-blue-500 font-medium">custom (default: {defaults.peak_power_kw})</span>
                    )}
                  </div>

                  <div className="text-[10px] text-[#888] mt-1">Synced with Assumptions tab</div>
                </div>
                {EQUIPMENT_IMAGES[meta.key] && (
                  <div className="w-40 relative rounded-lg overflow-hidden shrink-0 border border-gray-200 self-stretch">
                    <Image
                      src={EQUIPMENT_IMAGES[meta.key]}
                      alt={meta.name}
                      fill
                      className="object-cover"
                      sizes="160px"
                    />
                  </div>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

function CategoryGroup({
  label,
  sublabel,
  color,
  items,
  equipment,
  specsMap,
  defaultsMap,
  overrideFlags,
  onChange,
  onSpecChange,
}: {
  label: string
  sublabel: string
  color: string
  items: EquipmentMeta[]
  equipment: Record<string, BaselineEquipmentEntry>
  specsMap: Record<string, EquipmentSpecs>
  defaultsMap: Record<string, SpecDefaults>
  overrideFlags: Record<string, boolean>
  onChange: (updated: Record<string, BaselineEquipmentEntry>) => void
  onSpecChange: (equipmentKey: string, column: EditableColumn, value: number) => void
}) {
  const [open, setOpen] = useState(false)

  // Calculate totals for this category
  const dieselCount = items.reduce((s, m) => s + (equipment[m.key]?.existing_diesel || 0), 0)
  const electricCount = items.reduce((s, m) => s + (equipment[m.key]?.existing_electric || 0), 0)
  const totalCount = dieselCount + electricCount

  if (items.length === 0) return null

  const fallbackSpecs: EquipmentSpecs = { kwh_per_teu: 0, peak_power_kw: 0, capex_usd: 0, annual_opex_usd: 0 }
  const fallbackDefaults: SpecDefaults = { kwh_per_teu: 0, peak_power_kw: 0, capex_usd: 0, annual_opex_usd: 0 }

  return (
    <>
      <tr className="cursor-pointer hover:bg-gray-50" onClick={() => setOpen(!open)}>
        <td colSpan={6} className="py-2.5 px-3 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[#777] w-4">{open ? '\u25BC' : '\u25B6'}</span>
            <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: color }} />
            <span className="text-xs font-bold text-[#333]">{label}</span>
            <span className="text-[11px] text-[#888]">{sublabel}</span>
            <span className="text-[11px] text-[#888]">
              ({items.length} types{totalCount > 0 ? ` \u2022 ${totalCount} units` : ''})
            </span>
          </div>
        </td>
      </tr>

      {open && items.map((meta) => {
        const entry = equipment[meta.key] ?? { existing_diesel: 0, existing_electric: 0 }
        return (
          <EquipmentRow
            key={meta.key}
            meta={meta}
            entry={entry}
            specs={specsMap[meta.key] ?? fallbackSpecs}
            defaults={defaultsMap[meta.key] ?? fallbackDefaults}
            overrideFlags={overrideFlags}
            onChange={(updated) => onChange({ ...equipment, [meta.key]: updated })}
            onSpecChange={(column, value) => onSpecChange(meta.key, column, value)}
          />
        )
      })}
    </>
  )
}

export default function BaselineEquipmentTable({
  terminalType,
  equipment,
  onChange,
}: Props) {
  const { refreshAssumptionFingerprint, currentAssumptionFingerprint, activeAssumptionProfile } = usePieceContext()
  const PROFILE_NAME = activeAssumptionProfile

  // DB-backed equipment specs
  const [specsMap, setSpecsMap] = useState<Record<string, EquipmentSpecs>>({})
  const [defaultsMap, setDefaultsMap] = useState<Record<string, SpecDefaults>>({})
  const [overrideFlags, setOverrideFlags] = useState<Record<string, boolean>>({})

  // Fetch equipment specs from DB + overrides
  const fetchEquipmentSpecs = useCallback(async () => {
    const supabase = createClient()

    // Fetch all equipment rows
    const { data: eqRows } = await supabase
      .from('piece_equipment')
      .select('equipment_key, kwh_per_teu, peak_power_kw, capex_usd, annual_opex_usd')

    // Fetch overrides for piece_equipment
    const { data: overrides } = await supabase
      .from('piece_assumption_overrides')
      .select('row_key, column_name, custom_value')
      .eq('profile_name', PROFILE_NAME)
      .eq('table_name', 'piece_equipment')

    // Build defaults map
    const defs: Record<string, SpecDefaults> = {}
    const specs: Record<string, EquipmentSpecs> = {}
    for (const row of eqRows ?? []) {
      const d: SpecDefaults = {
        kwh_per_teu: Number(row.kwh_per_teu),
        peak_power_kw: Number(row.peak_power_kw),
        capex_usd: Number(row.capex_usd),
        annual_opex_usd: Number(row.annual_opex_usd),
      }
      defs[row.equipment_key] = d
      specs[row.equipment_key] = { ...d }
    }

    // Apply overrides
    const flags: Record<string, boolean> = {}
    for (const o of overrides ?? []) {
      const key = o.row_key
      const col = o.column_name as keyof EquipmentSpecs
      if (specs[key] && col in specs[key]) {
        specs[key][col] = Number(o.custom_value)
        flags[`${key}:${col}`] = true
      }
    }

    setDefaultsMap(defs)
    setSpecsMap(specs)
    setOverrideFlags(flags)
  }, [PROFILE_NAME])

  // Load on mount + when fingerprint changes (assumption tab sync)
  useEffect(() => {
    fetchEquipmentSpecs()
  }, [fetchEquipmentSpecs, currentAssumptionFingerprint])

  // Save override when a spec value is changed
  const saveEquipmentOverride = useCallback(async (
    equipmentKey: string,
    columnName: EditableColumn,
    value: number,
  ) => {
    const defaultValue = defaultsMap[equipmentKey]?.[columnName] ?? 0
    const supabase = createClient()

    if (value === defaultValue) {
      // Value matches default — delete override
      await supabase
        .from('piece_assumption_overrides')
        .delete()
        .eq('profile_name', PROFILE_NAME)
        .eq('table_name', 'piece_equipment')
        .eq('row_key', equipmentKey)
        .eq('column_name', columnName)
    } else {
      // Save/update override
      await supabase
        .from('piece_assumption_overrides')
        .upsert(
          {
            profile_name: PROFILE_NAME,
            table_name: 'piece_equipment',
            row_key: equipmentKey,
            column_name: columnName,
            custom_value: value,
          },
          { onConflict: 'profile_name,table_name,row_key,column_name' }
        )
    }

    // Update local state immediately
    setSpecsMap((prev) => ({
      ...prev,
      [equipmentKey]: { ...prev[equipmentKey], [columnName]: value },
    }))
    setOverrideFlags((prev) => ({
      ...prev,
      [`${equipmentKey}:${columnName}`]: value !== defaultValue,
    }))

    await refreshAssumptionFingerprint()
  }, [defaultsMap, refreshAssumptionFingerprint, PROFILE_NAME])

  // Filter equipment by terminal type
  const filteredEquipment = PIECE_EQUIPMENT.filter((e) =>
    e.terminalTypes.includes(terminalType)
  )

  // Calculate overall totals
  const totalDiesel = Object.values(equipment).reduce((s, e) => s + (e?.existing_diesel || 0), 0)
  const totalElectric = Object.values(equipment).reduce((s, e) => s + (e?.existing_electric || 0), 0)

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
      <table className="w-full">
        <thead>
          <tr>
            <th className="text-left py-3 px-3 text-[11px] font-bold uppercase text-[#666] bg-white w-[35%]">
              Equipment
            </th>
            <th className="text-center py-3 px-3 text-[11px] font-bold uppercase text-[#666] bg-white w-[10%]">
              kWh/TEU
            </th>
            <th className="text-center py-3 px-3 text-[11px] font-bold uppercase text-[#666] bg-white w-[10%]">
              Peak kW
            </th>
            <th className="text-center py-3 px-3 text-[11px] font-bold uppercase bg-[#fde8d8] text-[#7a5c10] w-[15%]">
              Diesel
              <span className="block text-[9px] font-normal text-[#996e1a]">(existing)</span>
            </th>
            <th className="text-center py-3 px-3 text-[11px] font-bold uppercase bg-[#d4eefa] text-[#2d5480] w-[15%]">
              Electric
              <span className="block text-[9px] font-normal text-[#3c6d9e]">(existing)</span>
            </th>
            <th className="text-center py-3 px-3 text-[11px] font-bold uppercase bg-[#eee] text-[#444] w-[15%]">
              Total
            </th>
          </tr>
        </thead>
        <tbody>
          {CATEGORIES.map((cat) => (
            <CategoryGroup
              key={cat.key}
              label={cat.label}
              sublabel={cat.sublabel}
              color={cat.color}
              items={filteredEquipment.filter((e) => e.category === cat.key)}
              equipment={equipment}
              specsMap={specsMap}
              defaultsMap={defaultsMap}
              overrideFlags={overrideFlags}
              onChange={onChange}
              onSpecChange={(equipmentKey, column, value) => saveEquipmentOverride(equipmentKey, column, value)}
            />
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-gray-300 bg-[#f5f5f5]">
            <td colSpan={3} className="py-3 px-3 text-right text-xs font-bold text-[#444]">
              Fleet Totals:
            </td>
            <td className="py-3 px-3 text-center text-sm font-bold text-[#7a5c10] bg-[#fef3e8]">
              {totalDiesel}
            </td>
            <td className="py-3 px-3 text-center text-sm font-bold text-[#2d5480] bg-[#eaf3fb]">
              {totalElectric}
            </td>
            <td className="py-3 px-3 text-center text-sm font-bold text-[#333]">
              {totalDiesel + totalElectric}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
