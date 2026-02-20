'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import type { TerminalType, BaselineEquipmentEntry, ScenarioEquipmentEntry } from '@/lib/types'
import { createClient } from '@/utils/supabase/client'
import { usePieceContext } from '@/app/piece/context/PieceContext'

// PROFILE_NAME is now derived from context inside components

type Props = {
  terminalType: TerminalType
  baseline: Record<string, BaselineEquipmentEntry>
  scenario: Record<string, ScenarioEquipmentEntry>
  onChange: (updated: Record<string, ScenarioEquipmentEntry>) => void
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

type SpecDefaults = {
  kwh_per_teu: number
  peak_power_kw: number
  capex_usd: number
  annual_opex_usd: number
}

const PIECE_EQUIPMENT: EquipmentMeta[] = [
  // Grid-powered equipment (always electric)
  { key: 'mhc', name: 'Mobile Harbor Crane', category: 'grid_powered', type: 'quayside', terminalTypes: ['container'] },
  { key: 'sts', name: 'Ship-to-Shore Crane', category: 'grid_powered', type: 'quayside', terminalTypes: ['container'] },
  { key: 'rmg', name: 'Rail Mounted Gantry', category: 'grid_powered', type: 'yard', terminalTypes: ['container'] },
  { key: 'rtg', name: 'Rubber Tired Gantry', category: 'grid_powered', type: 'yard', terminalTypes: ['container'] },
  { key: 'asc', name: 'Automated Stacking Crane', category: 'grid_powered', type: 'yard', terminalTypes: ['container'] },
  { key: 'reefer', name: 'Reefer Connection', category: 'grid_powered', type: 'yard', terminalTypes: ['container'] },

  // Mobile equipment (diesel or electric)
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
  { key: 'grid_powered', label: 'Grid-Powered Equipment', sublabel: '(add new only)', color: '#4a90b8' },
  { key: 'mobile', label: 'Mobile Equipment', sublabel: '(convert or add)', color: '#5ea648' },
] as const

function parseQty(raw: string): number {
  if (raw === '') return 0
  const n = parseInt(raw, 10)
  return isNaN(n) || n < 0 ? 0 : n
}

// Editable spec fields in expanded detail
const EDITABLE_COLUMNS = ['capex_usd', 'annual_opex_usd', 'kwh_per_teu', 'peak_power_kw'] as const
type EditableColumn = typeof EDITABLE_COLUMNS[number]

function EquipmentRow({
  meta,
  baselineEntry,
  scenarioEntry,
  specs,
  defaults,
  overrideFlags,
  onChange,
  onSpecChange,
}: {
  meta: EquipmentMeta
  baselineEntry: BaselineEquipmentEntry
  scenarioEntry: ScenarioEquipmentEntry
  specs: EquipmentSpecs
  defaults: SpecDefaults
  overrideFlags: Record<string, boolean>
  onChange: (updated: ScenarioEquipmentEntry) => void
  onSpecChange: (column: EditableColumn, value: number) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const isGridPowered = meta.category === 'grid_powered'

  // String state for editable fields
  const [capexStr, setCapexStr] = useState(String(specs.capex_usd))
  const [opexStr, setOpexStr] = useState(String(specs.annual_opex_usd))
  const [kwhStr, setKwhStr] = useState(String(specs.kwh_per_teu))
  const [peakStr, setPeakStr] = useState(String(specs.peak_power_kw))

  // Sync string state when specs change (assumption tab sync)
  useEffect(() => { setCapexStr(String(specs.capex_usd)) }, [specs.capex_usd])
  useEffect(() => { setOpexStr(String(specs.annual_opex_usd)) }, [specs.annual_opex_usd])
  useEffect(() => { setKwhStr(String(specs.kwh_per_teu)) }, [specs.kwh_per_teu])
  useEffect(() => { setPeakStr(String(specs.peak_power_kw)) }, [specs.peak_power_kw])

  const handleBlur = (column: EditableColumn, rawStr: string) => {
    const value = parseFloat(rawStr) || 0
    switch (column) {
      case 'capex_usd': setCapexStr(String(value)); break
      case 'annual_opex_usd': setOpexStr(String(value)); break
      case 'kwh_per_teu': setKwhStr(String(value)); break
      case 'peak_power_kw': setPeakStr(String(value)); break
    }
    onSpecChange(column, value)
  }

  // Calculate baseline totals
  const baselineDiesel = baselineEntry.existing_diesel
  const baselineElectric = baselineEntry.existing_electric

  // Calculate scenario totals
  const toConvert = Math.min(scenarioEntry.num_to_convert, baselineDiesel)
  const toAdd = scenarioEntry.num_to_add
  const scenarioElectric = baselineElectric + toConvert + toAdd
  const scenarioDiesel = baselineDiesel - toConvert

  // Validation: can't convert more than existing diesel
  const maxConvert = baselineDiesel
  const convertWarning = scenarioEntry.num_to_convert > maxConvert

  const capexHasOverride = overrideFlags[`${meta.key}:capex_usd`] ?? false
  const opexHasOverride = overrideFlags[`${meta.key}:annual_opex_usd`] ?? false
  const kwhHasOverride = overrideFlags[`${meta.key}:kwh_per_teu`] ?? false
  const peakHasOverride = overrideFlags[`${meta.key}:peak_power_kw`] ?? false

  const isMonetary = (col: EditableColumn) => col === 'capex_usd' || col === 'annual_opex_usd'

  function specInput(
    label: string,
    value: string,
    setter: (v: string) => void,
    column: EditableColumn,
    hasOverride: boolean,
    defaultVal: number,
    step: number,
    suffix?: string,
  ) {
    const isCurrency = isMonetary(column)
    return (
      <div className="flex items-center gap-2">
        <span className="text-[#777] w-16 shrink-0">{label}:</span>
        {isCurrency && <span className="text-[#777] text-xs">$</span>}
        <input
          type="number"
          min={0}
          step={step}
          value={value}
          onChange={(e) => setter(e.target.value)}
          onBlur={() => handleBlur(column, value)}
          className={`w-32 px-2 py-1 rounded border text-xs text-[#414141] focus:outline-none ${
            hasOverride
              ? 'border-blue-300 bg-blue-50/40 focus:border-blue-500'
              : 'border-gray-300 bg-white focus:border-[#3c5e86]'
          }`}
        />
        {suffix && <span className="text-[#888] text-[10px]">{isCurrency ? `USD${suffix}` : suffix}</span>}
        {hasOverride && (
          <span className="text-[10px] text-blue-500 font-medium">
            custom (default: {isCurrency ? `$${defaultVal.toLocaleString()} USD` : defaultVal})
          </span>
        )}
      </div>
    )
  }

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

        {/* Baseline diesel */}
        <td className="py-2 px-3 text-center text-xs bg-[#f8f8f8]">
          {isGridPowered ? (
            <span className="text-[#bbb]">—</span>
          ) : (
            <span className="text-[#7a5c10] font-medium">{baselineDiesel}</span>
          )}
        </td>

        {/* Baseline electric */}
        <td className="py-2 px-3 text-center text-xs bg-[#f8f8f8]">
          <span className="text-[#2d5480] font-medium">{baselineElectric}</span>
        </td>

        {/* Convert column */}
        <td className="py-2 px-3 bg-[#fff8e8]">
          {isGridPowered ? (
            <div className="text-center text-xs text-[#bbb]">—</div>
          ) : (
            <div className="relative">
              <input
                type="number"
                min={0}
                max={maxConvert}
                value={scenarioEntry.num_to_convert || ''}
                placeholder="0"
                onChange={(e) => onChange({ ...scenarioEntry, num_to_convert: parseQty(e.target.value) })}
                className={`w-full px-2 py-1.5 rounded border text-sm text-center text-[#414141] bg-white focus:outline-none ${
                  convertWarning
                    ? 'border-red-400 focus:border-red-500'
                    : 'border-[#e0c9ad] focus:border-[#c9a87c]'
                }`}
              />
              {maxConvert > 0 && (
                <div className="text-[9px] text-[#999] text-center mt-0.5">
                  max {maxConvert}
                </div>
              )}
            </div>
          )}
        </td>

        {/* Add New column */}
        <td className="py-2 px-3 bg-[#e8f5e9]">
          <input
            type="number"
            min={0}
            value={scenarioEntry.num_to_add || ''}
            placeholder="0"
            onChange={(e) => onChange({ ...scenarioEntry, num_to_add: parseQty(e.target.value) })}
            className="w-full px-2 py-1.5 rounded border border-[#b4d9b6] text-sm text-center text-[#414141] bg-white focus:border-[#4caf50] focus:outline-none"
          />
        </td>

        {/* Resulting fleet - diesel */}
        <td className="py-2 px-3 text-center text-xs bg-[#f0f0f0]">
          {isGridPowered ? (
            <span className="text-[#bbb]">—</span>
          ) : scenarioDiesel > 0 ? (
            <span className="text-[#7a5c10] font-semibold">{scenarioDiesel}</span>
          ) : (
            <span className="text-[#bbb]">0</span>
          )}
        </td>

        {/* Resulting fleet - electric */}
        <td className="py-2 px-3 text-center text-xs bg-[#f0f0f0]">
          {scenarioElectric > 0 ? (
            <span className="text-[#2d5480] font-semibold">{scenarioElectric}</span>
          ) : (
            <span className="text-[#bbb]">0</span>
          )}
        </td>
      </tr>

      {expanded && (
        <tr className="border-b border-gray-100">
          <td colSpan={7} className="p-0">
            <div className="bg-[#f5f5f5] px-8 py-3 text-xs space-y-2">
              <div className="inline-flex gap-6">
                <div className="space-y-2">
                  <div><span className="text-[#777]">Type:</span> <span className="text-[#444]">{meta.type}</span></div>
                  {specInput('CAPEX', capexStr, setCapexStr, 'capex_usd', capexHasOverride, defaults.capex_usd, 10000, '/unit')}
                  {specInput('OPEX', opexStr, setOpexStr, 'annual_opex_usd', opexHasOverride, defaults.annual_opex_usd, 1000, '/unit/year')}
                  {specInput('kWh/TEU', kwhStr, setKwhStr, 'kwh_per_teu', kwhHasOverride, defaults.kwh_per_teu, 0.1)}
                  {specInput('Peak kW', peakStr, setPeakStr, 'peak_power_kw', peakHasOverride, defaults.peak_power_kw, 10)}
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
  baseline,
  scenario,
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
  baseline: Record<string, BaselineEquipmentEntry>
  scenario: Record<string, ScenarioEquipmentEntry>
  specsMap: Record<string, EquipmentSpecs>
  defaultsMap: Record<string, SpecDefaults>
  overrideFlags: Record<string, boolean>
  onChange: (updated: Record<string, ScenarioEquipmentEntry>) => void
  onSpecChange: (equipmentKey: string, column: EditableColumn, value: number) => void
}) {
  const [open, setOpen] = useState(false)

  // Calculate category totals
  let totalConvert = 0
  let totalAdd = 0

  for (const item of items) {
    const base = baseline[item.key] ?? { existing_diesel: 0, existing_electric: 0 }
    const scen = scenario[item.key] ?? { num_to_convert: 0, num_to_add: 0 }
    totalConvert += Math.min(scen.num_to_convert, base.existing_diesel)
    totalAdd += scen.num_to_add
  }

  if (items.length === 0) return null

  const fallbackSpecs: EquipmentSpecs = { kwh_per_teu: 0, peak_power_kw: 0, capex_usd: 0, annual_opex_usd: 0 }
  const fallbackDefaults: SpecDefaults = { kwh_per_teu: 0, peak_power_kw: 0, capex_usd: 0, annual_opex_usd: 0 }

  return (
    <>
      <tr className="cursor-pointer hover:bg-gray-50" onClick={() => setOpen(!open)}>
        <td colSpan={7} className="py-2.5 px-3 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[#777] w-4">{open ? '\u25BC' : '\u25B6'}</span>
            <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: color }} />
            <span className="text-xs font-bold text-[#333]">{label}</span>
            <span className="text-[11px] text-[#888]">{sublabel}</span>
            {(totalConvert > 0 || totalAdd > 0) && (
              <span className="text-[11px] text-[#2e7d32] font-semibold">
                {totalConvert > 0 && `${totalConvert} converting`}
                {totalConvert > 0 && totalAdd > 0 && ', '}
                {totalAdd > 0 && `${totalAdd} new`}
              </span>
            )}
          </div>
        </td>
      </tr>

      {open && items.map((meta) => {
        const baselineEntry = baseline[meta.key] ?? { existing_diesel: 0, existing_electric: 0 }
        const scenarioEntry = scenario[meta.key] ?? { num_to_convert: 0, num_to_add: 0 }
        return (
          <EquipmentRow
            key={meta.key}
            meta={meta}
            baselineEntry={baselineEntry}
            scenarioEntry={scenarioEntry}
            specs={specsMap[meta.key] ?? fallbackSpecs}
            defaults={defaultsMap[meta.key] ?? fallbackDefaults}
            overrideFlags={overrideFlags}
            onChange={(updated) => onChange({ ...scenario, [meta.key]: updated })}
            onSpecChange={(column, value) => onSpecChange(meta.key, column, value)}
          />
        )
      })}
    </>
  )
}

export default function ScenarioEquipmentTable({
  terminalType,
  baseline,
  scenario,
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

    const { data: eqRows } = await supabase
      .from('piece_equipment')
      .select('equipment_key, kwh_per_teu, peak_power_kw, capex_usd, annual_opex_usd')

    const { data: overrides } = await supabase
      .from('piece_assumption_overrides')
      .select('row_key, column_name, custom_value')
      .eq('profile_name', PROFILE_NAME)
      .eq('table_name', 'piece_equipment')

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

  useEffect(() => {
    fetchEquipmentSpecs()
  }, [fetchEquipmentSpecs, currentAssumptionFingerprint])

  const saveEquipmentOverride = useCallback(async (
    equipmentKey: string,
    columnName: EditableColumn,
    value: number,
  ) => {
    const defaultValue = defaultsMap[equipmentKey]?.[columnName] ?? 0
    const supabase = createClient()

    if (value === defaultValue) {
      await supabase
        .from('piece_assumption_overrides')
        .delete()
        .eq('profile_name', PROFILE_NAME)
        .eq('table_name', 'piece_equipment')
        .eq('row_key', equipmentKey)
        .eq('column_name', columnName)
    } else {
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
  let totalBaselineDiesel = 0
  let totalBaselineElectric = 0
  let totalConvert = 0
  let totalAdd = 0

  for (const item of filteredEquipment) {
    const base = baseline[item.key] ?? { existing_diesel: 0, existing_electric: 0 }
    const scen = scenario[item.key] ?? { num_to_convert: 0, num_to_add: 0 }
    totalBaselineDiesel += base.existing_diesel
    totalBaselineElectric += base.existing_electric
    totalConvert += Math.min(scen.num_to_convert, base.existing_diesel)
    totalAdd += scen.num_to_add
  }

  const scenarioElectric = totalBaselineElectric + totalConvert + totalAdd
  const scenarioDiesel = totalBaselineDiesel - totalConvert

  // Helper to copy baseline as "convert all"
  function convertAll() {
    const updated: Record<string, ScenarioEquipmentEntry> = {}
    for (const item of filteredEquipment) {
      const base = baseline[item.key] ?? { existing_diesel: 0, existing_electric: 0 }
      updated[item.key] = {
        num_to_convert: base.existing_diesel,
        num_to_add: scenario[item.key]?.num_to_add ?? 0,
      }
    }
    onChange(updated)
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
      <div className="flex items-center justify-end px-4 py-2.5 border-b border-gray-100">
        <button
          type="button"
          onClick={convertAll}
          className="text-[11px] font-semibold text-[#bf360c] hover:text-[#8e2000]"
        >
          Convert All Diesel &rarr;
        </button>
      </div>
      <table className="w-full">
        <thead>
          <tr>
            <th className="text-left py-3 px-3 text-[11px] font-bold uppercase text-[#666] bg-white w-[22%]">
              Equipment
            </th>
            <th colSpan={2} className="text-center py-3 px-3 text-[11px] font-bold uppercase bg-[#f0f0f0] text-[#555] w-[14%]">
              Baseline
              <span className="block text-[9px] font-normal text-[#888]">(current fleet)</span>
            </th>
            <th className="text-center py-3 px-3 text-[11px] font-bold uppercase bg-[#fff3e0] text-[#bf360c] w-[16%]">
              Convert
              <span className="block text-[9px] font-normal text-[#d4651e]">(diesel → electric)</span>
            </th>
            <th className="text-center py-3 px-3 text-[11px] font-bold uppercase bg-[#e8f5e9] text-[#2e7d32] w-[16%]">
              Add New
              <span className="block text-[9px] font-normal text-[#388e3c]">(electric units)</span>
            </th>
            <th colSpan={2} className="text-center py-3 px-3 text-[11px] font-bold uppercase bg-[#dceefa] text-[#0d47a1] w-[16%]">
              Scenario Fleet
              <span className="block text-[9px] font-normal text-[#2d5480]">(resulting)</span>
            </th>
          </tr>
          <tr className="border-b border-gray-200">
            <th className="py-1 px-3 bg-white"></th>
            <th className="py-1 px-3 text-center text-[10px] font-semibold text-[#7a5c10] bg-[#fef3e8]">Diesel</th>
            <th className="py-1 px-3 text-center text-[10px] font-semibold text-[#2d5480] bg-[#eaf3fb]">Electric</th>
            <th className="py-1 px-3 bg-[#fff8f0]"></th>
            <th className="py-1 px-3 bg-[#f1f8e9]"></th>
            <th className="py-1 px-3 text-center text-[10px] font-semibold text-[#7a5c10] bg-[#f0f0f0]">Diesel</th>
            <th className="py-1 px-3 text-center text-[10px] font-semibold text-[#2d5480] bg-[#f0f0f0]">Electric</th>
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
              baseline={baseline}
              scenario={scenario}
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
            <td className="py-3 px-3 text-right text-xs font-bold text-[#444]">
              Fleet Totals:
            </td>
            <td className="py-3 px-3 text-center text-sm font-bold text-[#7a5c10] bg-[#fef3e8]">
              {totalBaselineDiesel}
            </td>
            <td className="py-3 px-3 text-center text-sm font-bold text-[#2d5480] bg-[#eaf3fb]">
              {totalBaselineElectric}
            </td>
            <td className="py-3 px-3 text-center text-sm font-bold text-[#bf360c] bg-[#fff8f0]">
              {totalConvert > 0 ? `-${totalConvert}` : '\u2014'}
            </td>
            <td className="py-3 px-3 text-center text-sm font-bold text-[#2e7d32] bg-[#f1f8e9]">
              {totalAdd > 0 ? `+${totalAdd}` : '\u2014'}
            </td>
            <td className="py-3 px-3 text-center text-sm font-bold text-[#7a5c10] bg-[#f0f0f0]">
              {scenarioDiesel}
            </td>
            <td className="py-3 px-3 text-center text-sm font-bold text-[#2d5480] bg-[#f0f0f0]">
              {scenarioElectric}
            </td>
          </tr>
        </tfoot>
      </table>

      {/* Footer */}
      <div className="px-4 py-2.5 bg-[#f5f5f5] border-t border-gray-100">
        <div className="text-[11px] text-[#666]">
          Conversion CAPEX applies to converted units. New units use full electric CAPEX.
        </div>
      </div>
    </div>
  )
}
