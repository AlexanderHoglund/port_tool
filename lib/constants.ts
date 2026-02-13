import type { PortConfig, OnshoreConfig, OffshoreConfig, TerminalConfig, VesselCallConfig } from './types'

// ═══════════════════════════════════════════════════════════
// MMMC Design Palette
// ═══════════════════════════════════════════════════════════

export const TYPE_COLORS: Record<string, string> = {
  quayside: '#3c5e86',
  yard: '#447a7a',
  horizontal: '#bc8e54',
}

export const ELECTRIFIED_STYLE: Record<string, string> = {
  Yes: 'bg-[#dcf0d6] text-[#286464]',
  No: 'bg-[#fae0da] text-[#9e5858]',
}

// ═══════════════════════════════════════════════════════════
// Shared CSS Classes
// ═══════════════════════════════════════════════════════════

export const inputBase =
  'w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-[#414141] bg-white focus:border-[#68a4c2] focus:ring-2 focus:ring-[#d4eefa] focus:outline-none transition-all'

export const labelBase = 'block text-xs font-medium text-[#585858] mb-1'

export const sectionHeading =
  'text-[11px] font-bold uppercase tracking-widest text-[#8c8c8c] mb-4'

// ═══════════════════════════════════════════════════════════
// Equipment Metadata
// ═══════════════════════════════════════════════════════════

export type EquipmentMeta = {
  key: string
  name: string
  primaryFunction: string
  equipmentType: string
  typeKey: string
  electrificationStatus: string
  challenges: string
  image?: string
}

export const EQUIPMENT: EquipmentMeta[] = [
  {
    key: 'sts_crane',
    name: 'Ship-to-Shore Container Crane',
    primaryFunction: 'Ship-to-shore container handling',
    equipmentType: 'Quayside Equipment',
    typeKey: 'quayside',
    electrificationStatus: 'Mature',
    challenges: 'High power requirements',
    image: '/port_images/ship_to_shore.png',
  },
  {
    key: 'rtg_crane',
    name: 'Rubber Tired Gantry Crane',
    primaryFunction: 'Yard container stacking and transport',
    equipmentType: 'Yard Equipment',
    typeKey: 'yard',
    electrificationStatus: 'Developing',
    challenges: 'Battery technology and charging infrastructure',
    image: '/port_images/Rubber Tired Gantry Crane.jpg',
  },
  {
    key: 'rmg_crane',
    name: 'Rail Mounted Gantry Crane',
    primaryFunction: 'Automated yard container handling',
    equipmentType: 'Yard Equipment',
    typeKey: 'yard',
    electrificationStatus: 'Mature',
    challenges: 'Cable management complexity',
    image: '/port_images/Rail Mounted Gantry Crane.jpg',
  },
  {
    key: 'asc',
    name: 'Automated Stacking Crane',
    primaryFunction: 'Fully automated container stacking',
    equipmentType: 'Yard Equipment',
    typeKey: 'yard',
    electrificationStatus: 'Mature',
    challenges: 'High automation integration costs',
    image: '/port_images/Automated Stacking Crane.jpg',
  },
  {
    key: 'straddle_carrier',
    name: 'Straddle Carrier',
    primaryFunction: 'Container pickup and stacking',
    equipmentType: 'Yard Equipment',
    typeKey: 'yard',
    electrificationStatus: 'Developing',
    challenges: 'Battery weight and range limitations',
    image: '/port_images/Straddle Carrier.jpg',
  },
  {
    key: 'agv',
    name: 'Automated Guided Vehicle',
    primaryFunction: 'Automated horizontal container transport',
    equipmentType: 'Horizontal Transport',
    typeKey: 'horizontal',
    electrificationStatus: 'Mature',
    challenges: 'Battery charging coordination',
    image: '/port_images/Automated Guided Vehicle.png',
  },
  {
    key: 'reach_stacker',
    name: 'Reach Stacker',
    primaryFunction: 'Container pickup and short stacking',
    equipmentType: 'Yard Equipment',
    typeKey: 'yard',
    electrificationStatus: 'Developing',
    challenges: 'High lifting loads on battery systems',
    image: '/port_images/Reach Stacker.jpg',
  },
  {
    key: 'ech',
    name: 'Empty Container Handler',
    primaryFunction: 'Empty container handling and stacking',
    equipmentType: 'Yard Equipment',
    typeKey: 'yard',
    electrificationStatus: 'Developing',
    challenges: 'Duty cycle demands on batteries',
    image: '/port_images/Empty Container Handler.png',
  },
  {
    key: 'terminal_tractor',
    name: 'Terminal Tractor',
    primaryFunction: 'Container trailer transport',
    equipmentType: 'Horizontal Transport',
    typeKey: 'horizontal',
    electrificationStatus: 'Developing',
    challenges: 'Range and charging downtime',
    image: '/port_images/Terminal Tractor.png',
  },
  {
    key: 'high_bay_storage',
    name: 'Automated High Bay Storage',
    primaryFunction: 'High-density automated storage',
    equipmentType: 'Yard Equipment',
    typeKey: 'yard',
    electrificationStatus: 'Mature',
    challenges: 'High initial capital cost',
    image: '/port_images/Automated High Bay Storage System.jpg',
  },
  {
    key: 'mobile_harbor_crane',
    name: 'Mobile Harbor Crane',
    primaryFunction: 'Versatile ship-to-shore and yard operations',
    equipmentType: 'Quayside Equipment',
    typeKey: 'quayside',
    electrificationStatus: 'Developing',
    challenges: 'Hybrid drivetrain complexity',
    image: '/port_images/mobile harbour crane.jpg',
  },
  {
    key: 'portal_crane',
    name: 'Portal Crane',
    primaryFunction: 'Fixed-position cargo handling and container operations',
    equipmentType: 'Quayside Equipment',
    typeKey: 'quayside',
    electrificationStatus: 'Mature',
    challenges: 'Grid connection capacity',
    image: '/port_images/Portal Crane.jpg',
  },
]

/** All valid equipment keys */
export const EQUIPMENT_KEYS = EQUIPMENT.map(e => e.key)

/** Equipment grouped by category for collapsible UI sections */
export const EQUIPMENT_GROUPS = [
  {
    typeKey: 'quayside',
    label: 'Quayside Equipment',
    color: TYPE_COLORS.quayside,
    items: EQUIPMENT.filter(e => e.typeKey === 'quayside'),
  },
  {
    typeKey: 'yard',
    label: 'Yard Equipment',
    color: TYPE_COLORS.yard,
    items: EQUIPMENT.filter(e => e.typeKey === 'yard'),
  },
  {
    typeKey: 'horizontal',
    label: 'Horizontal Transport',
    color: TYPE_COLORS.horizontal,
    items: EQUIPMENT.filter(e => e.typeKey === 'horizontal'),
  },
] as const

// ═══════════════════════════════════════════════════════════
// Port Size Options
// ═══════════════════════════════════════════════════════════

export const PORT_SIZES = [
  { value: '', label: 'Select size...' },
  { value: 'small_feeder', label: 'Small / Feeder' },
  { value: 'regional', label: 'Regional' },
  { value: 'hub', label: 'Hub' },
  { value: 'mega_hub', label: 'Mega Hub' },
] as const

// ═══════════════════════════════════════════════════════════
// Vessel Types (for offshore vessel call selection)
// ═══════════════════════════════════════════════════════════

export const VESSEL_TYPES = [
  { value: 'container_small', label: 'Container (Feeder)' },
  { value: 'container_medium', label: 'Container (Panamax)' },
  { value: 'container_large', label: 'Container (Post-Panamax)' },
  { value: 'container_ulcv', label: 'Container (ULCV)' },
  { value: 'bulk_carrier', label: 'Bulk Carrier' },
  { value: 'tanker', label: 'Tanker' },
  { value: 'lng_carrier', label: 'LNG Carrier' },
  { value: 'roro', label: 'RoRo' },
  { value: 'cruise', label: 'Cruise' },
  { value: 'general_cargo', label: 'General Cargo' },
] as const

// ═══════════════════════════════════════════════════════════
// Default / Initial Values
// ═══════════════════════════════════════════════════════════

export const INITIAL_PORT: PortConfig = {
  name: '',
  location: '',
  size_key: '',
}

function emptyEquipmentRecord(): Record<string, number> {
  return Object.fromEntries(EQUIPMENT_KEYS.map(k => [k, 0]))
}

export function createDefaultOnshore(): OnshoreConfig {
  return {
    annual_teu: 0,
    terminal_area_ha: 0,
    baseline_equipment: emptyEquipmentRecord(),
    scenario_equipment: emptyEquipmentRecord(),
    shore_power_connections: 0,
  }
}

export function createDefaultOffshore(): OffshoreConfig {
  return {
    vessel_calls: [],
    baseline_tugs: { type: 'diesel', count: 0 },
    scenario_tugs: { type: 'electric', count: 0 },
  }
}

let terminalCounter = 0

export function createDefaultTerminal(): TerminalConfig {
  terminalCounter++
  return {
    id: crypto.randomUUID(),
    name: `Terminal ${terminalCounter}`,
    cargo_type: 'container',
    onshore: createDefaultOnshore(),
    offshore: createDefaultOffshore(),
  }
}

export function resetTerminalCounter() {
  terminalCounter = 0
}

// ═══════════════════════════════════════════════════════════
// Typical Port Configurations (realistic defaults per size)
// ═══════════════════════════════════════════════════════════

export type TypicalTerminalConfig = {
  name: string
  teu: number
  area_ha: number
  equipment: Record<string, number>
  vessel_calls: VesselCallConfig[]
  tug_count: number
  shore_power: number
}

export type TypicalPortConfig = {
  terminals: TypicalTerminalConfig[]
}

// ═══════════════════════════════════════════════════════════
// Assumption Tables (used by editable + read-only assumptions pages)
// ═══════════════════════════════════════════════════════════

export type AssumptionTableKey = 'economic_assumptions' | 'piece_equipment' | 'piece_evse' | 'piece_fleet_ops' | 'piece_grid'

export const ASSUMPTION_TABLES: { key: AssumptionTableKey; label: string; description: string; rowKeyCol: string; icon: string }[] = [
  {
    key: 'economic_assumptions',
    label: 'Economic Parameters',
    description: 'Electricity price, diesel price, emission factors, discount rates, and other financial assumptions',
    rowKeyCol: 'assumption_key',
    icon: '/icons/Icons/Business/Price tag dollar.svg',
  },
  {
    key: 'piece_equipment',
    label: 'Equipment Specifications',
    description: 'CAPEX, OPEX, peak power, energy intensity, and throughput ratios for terminal equipment',
    rowKeyCol: 'equipment_key',
    icon: '/icons/Icons/Efficiency/Gears.svg',
  },
  {
    key: 'piece_evse',
    label: 'EVSE Chargers',
    description: 'Charger types, power ratings, costs, and units per charger for battery-powered equipment',
    rowKeyCol: 'evse_key',
    icon: '/icons/Icons/Energy & Fuels/Plug.svg',
  },
  {
    key: 'piece_fleet_ops',
    label: 'Vessel & OPS',
    description: 'Shore power demand, OPS infrastructure costs, and berth parameters per vessel segment',
    rowKeyCol: 'vessel_segment_key',
    icon: '/icons/Icons/Shipping/Cargo Ship.svg',
  },
  {
    key: 'piece_grid',
    label: 'Grid Infrastructure',
    description: 'Substation costs, cable costs, voltage levels, and simultaneity factors',
    rowKeyCol: 'component_key',
    icon: '/icons/Icons/Energy & Fuels/Electric power.svg',
  },
]

// Columns to hide in the UI
export const HIDDEN_COLUMNS = ['id', 'created_at']

// Columns that should not be editable (identifiers, display names, text descriptors)
export const NON_EDITABLE_COLUMNS = [
  'assumption_key', 'equipment_key', 'evse_key', 'vessel_segment_key', 'component_key',
  'display_name', 'description', 'equipment_category', 'equipment_type', 'terminal_type_key',
  'unit_label', 'unit', 'source', 'cable_type', 'cable_size', 'ops_voltage',
]

// ═══════════════════════════════════════════════════════════
// Typical Port Configurations (realistic defaults per size)
// ═══════════════════════════════════════════════════════════

export const TYPICAL_PORT_CONFIGS: Record<string, TypicalPortConfig> = {
  small_feeder: {
    terminals: [
      {
        name: 'Main Terminal',
        teu: 300_000,
        area_ha: 25,
        equipment: {
          sts_crane: 3, rtg_crane: 6, reach_stacker: 4, ech: 3, terminal_tractor: 15,
        },
        vessel_calls: [
          { vessel_type: 'container_small', annual_calls: 500, avg_berth_hours: 12 },
          { vessel_type: 'general_cargo', annual_calls: 200, avg_berth_hours: 24 },
        ],
        tug_count: 2,
        shore_power: 1,
      },
    ],
  },
  regional: {
    terminals: [
      {
        name: 'Container Terminal',
        teu: 800_000,
        area_ha: 40,
        equipment: {
          sts_crane: 4, rtg_crane: 8, rmg_crane: 2, straddle_carrier: 5, reach_stacker: 4, ech: 3, terminal_tractor: 20,
        },
        vessel_calls: [
          { vessel_type: 'container_medium', annual_calls: 600, avg_berth_hours: 18 },
          { vessel_type: 'container_small', annual_calls: 300, avg_berth_hours: 12 },
        ],
        tug_count: 3,
        shore_power: 2,
      },
      {
        name: 'Multi-Purpose Terminal',
        teu: 400_000,
        area_ha: 20,
        equipment: {
          sts_crane: 2, rtg_crane: 4, rmg_crane: 2, straddle_carrier: 3, reach_stacker: 2, ech: 2, terminal_tractor: 10,
        },
        vessel_calls: [
          { vessel_type: 'container_small', annual_calls: 200, avg_berth_hours: 12 },
          { vessel_type: 'bulk_carrier', annual_calls: 200, avg_berth_hours: 36 },
        ],
        tug_count: 2,
        shore_power: 0,
      },
    ],
  },
  hub: {
    terminals: [
      {
        name: 'Deep-Water Container Terminal',
        teu: 2_500_000,
        area_ha: 70,
        equipment: {
          sts_crane: 8, rtg_crane: 12, rmg_crane: 6, asc: 4, agv: 12, straddle_carrier: 5, reach_stacker: 3, ech: 4, terminal_tractor: 25,
        },
        vessel_calls: [
          { vessel_type: 'container_large', annual_calls: 800, avg_berth_hours: 24 },
          { vessel_type: 'container_medium', annual_calls: 300, avg_berth_hours: 18 },
        ],
        tug_count: 4,
        shore_power: 3,
      },
      {
        name: 'Feeder Container Terminal',
        teu: 1_500_000,
        area_ha: 45,
        equipment: {
          sts_crane: 4, rtg_crane: 8, rmg_crane: 4, asc: 2, agv: 6, straddle_carrier: 3, reach_stacker: 3, ech: 4, terminal_tractor: 15,
        },
        vessel_calls: [
          { vessel_type: 'container_medium', annual_calls: 400, avg_berth_hours: 18 },
          { vessel_type: 'container_small', annual_calls: 300, avg_berth_hours: 12 },
        ],
        tug_count: 3,
        shore_power: 1,
      },
      {
        name: 'Liquid & Dry Bulk Terminal',
        teu: 1_000_000,
        area_ha: 35,
        equipment: {
          sts_crane: 3, rtg_crane: 4, rmg_crane: 2, straddle_carrier: 2, reach_stacker: 2, ech: 2, terminal_tractor: 10,
        },
        vessel_calls: [
          { vessel_type: 'bulk_carrier', annual_calls: 150, avg_berth_hours: 36 },
          { vessel_type: 'tanker', annual_calls: 100, avg_berth_hours: 30 },
        ],
        tug_count: 2,
        shore_power: 0,
      },
    ],
  },
  mega_hub: {
    terminals: [
      {
        name: 'ULCV Deep-Sea Terminal',
        teu: 5_000_000,
        area_ha: 120,
        equipment: {
          sts_crane: 14, rtg_crane: 12, rmg_crane: 10, asc: 8, agv: 24, straddle_carrier: 4, reach_stacker: 3, ech: 4, terminal_tractor: 30, high_bay_storage: 2,
        },
        vessel_calls: [
          { vessel_type: 'container_ulcv', annual_calls: 1000, avg_berth_hours: 28 },
          { vessel_type: 'container_large', annual_calls: 500, avg_berth_hours: 24 },
        ],
        tug_count: 4,
        shore_power: 4,
      },
      {
        name: 'Post-Panamax Terminal',
        teu: 4_000_000,
        area_ha: 100,
        equipment: {
          sts_crane: 10, rtg_crane: 10, rmg_crane: 8, asc: 6, agv: 18, straddle_carrier: 4, reach_stacker: 3, ech: 4, terminal_tractor: 25, portal_crane: 3,
        },
        vessel_calls: [
          { vessel_type: 'container_ulcv', annual_calls: 500, avg_berth_hours: 28 },
          { vessel_type: 'container_large', annual_calls: 500, avg_berth_hours: 24 },
          { vessel_type: 'container_medium', annual_calls: 200, avg_berth_hours: 18 },
        ],
        tug_count: 3,
        shore_power: 2,
      },
      {
        name: 'Feeder & Regional Terminal',
        teu: 3_500_000,
        area_ha: 90,
        equipment: {
          sts_crane: 8, rtg_crane: 10, rmg_crane: 6, asc: 4, agv: 10, straddle_carrier: 4, reach_stacker: 3, ech: 4, terminal_tractor: 25, portal_crane: 3, mobile_harbor_crane: 2,
        },
        vessel_calls: [
          { vessel_type: 'container_medium', annual_calls: 200, avg_berth_hours: 18 },
          { vessel_type: 'container_small', annual_calls: 400, avg_berth_hours: 12 },
          { vessel_type: 'bulk_carrier', annual_calls: 200, avg_berth_hours: 36 },
        ],
        tug_count: 3,
        shore_power: 1,
      },
      {
        name: 'Cruise & Specialised Terminal',
        teu: 2_500_000,
        area_ha: 90,
        equipment: {
          sts_crane: 8, rtg_crane: 8, rmg_crane: 6, asc: 2, agv: 8, straddle_carrier: 3, reach_stacker: 3, ech: 3, terminal_tractor: 20, high_bay_storage: 2, mobile_harbor_crane: 2,
        },
        vessel_calls: [
          { vessel_type: 'tanker', annual_calls: 150, avg_berth_hours: 30 },
          { vessel_type: 'cruise', annual_calls: 30, avg_berth_hours: 10 },
          { vessel_type: 'general_cargo', annual_calls: 100, avg_berth_hours: 24 },
        ],
        tug_count: 2,
        shore_power: 1,
      },
    ],
  },
}
