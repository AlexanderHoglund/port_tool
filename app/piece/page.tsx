'use client'

import { useState, useCallback } from 'react'
import type {
  PortConfig,
  PieceTerminalConfig,
  PiecePortResult,
  PieceCalculationRequest,
  TerminalType,
} from '@/lib/types'
import PortIdentitySection from '@/components/shipping/PortIdentitySection'
import PieceTerminalCard from '@/components/shipping/PieceTerminalCard'
import PieceResultsSection from '@/components/shipping/PieceResultsSection'

const INITIAL_PORT: PortConfig = {
  name: '',
  location: '',
  size_key: '',
}

let terminalCounter = 0

function createDefaultTerminal(): PieceTerminalConfig {
  terminalCounter++
  return {
    id: crypto.randomUUID(),
    name: `Terminal ${terminalCounter}`,
    terminal_type: 'container',
    annual_teu: 0,
    berths: [],
    baseline_equipment: {},
    scenario_equipment: {},
  }
}

export default function PiecePage() {
  const [port, setPort] = useState<PortConfig>(INITIAL_PORT)
  const [terminals, setTerminals] = useState<PieceTerminalConfig[]>(() => {
    terminalCounter = 0
    return [createDefaultTerminal()]
  })
  const [result, setResult] = useState<PiecePortResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Terminal CRUD
  const addTerminal = useCallback(() => {
    setTerminals((prev) => [...prev, createDefaultTerminal()])
  }, [])

  const removeTerminal = useCallback((id: string) => {
    setTerminals((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const updateTerminal = useCallback((id: string, updated: PieceTerminalConfig) => {
    setTerminals((prev) => prev.map((t) => (t.id === id ? updated : t)))
  }, [])

  // Load typical values based on port size
  const loadTypicalValues = useCallback(() => {
    if (!port.size_key) return

    terminalCounter = 0

    // Comprehensive port configurations with realistic PIECE values
    type TerminalDef = {
      name: string
      type: TerminalType
      teu: number
      berths: { segment: string; calls: number; hours: number }[]
      equipment: Record<string, number>
      cableLength: number
    }

    type PortDef = {
      terminals: TerminalDef[]
    }

    const portConfigs: Record<string, PortDef> = {
      small_feeder: {
        terminals: [
          {
            name: 'Container Terminal',
            type: 'container',
            teu: 100000,
            berths: [
              { segment: 'container_0_3k', calls: 180, hours: 18 },
              { segment: 'container_3_6k', calls: 120, hours: 24 },
            ],
            equipment: {
              mhc: 2,
              tt: 8,
              rs: 2,
              ech: 1,
              reefer: 50,
            },
            cableLength: 400,
          },
        ],
      },

      regional: {
        terminals: [
          {
            name: 'Main Container Terminal',
            type: 'container',
            teu: 500000,
            berths: [
              { segment: 'container_3_6k', calls: 200, hours: 20 },
              { segment: 'container_3_6k', calls: 180, hours: 22 },
              { segment: 'container_6_10k', calls: 150, hours: 28 },
              { segment: 'container_6_10k', calls: 140, hours: 30 },
            ],
            equipment: {
              sts: 4,
              rtg: 12,
              tt: 20,
              ech: 4,
              rs: 4,
              reefer: 200,
            },
            cableLength: 800,
          },
        ],
      },

      hub: {
        terminals: [
          {
            name: 'Container Terminal North',
            type: 'container',
            teu: 1200000,
            berths: [
              { segment: 'container_6_10k', calls: 250, hours: 26 },
              { segment: 'container_6_10k', calls: 240, hours: 28 },
              { segment: 'container_10k_plus', calls: 180, hours: 32 },
              { segment: 'container_10k_plus', calls: 170, hours: 34 },
            ],
            equipment: {
              sts: 8,
              rmg: 16,
              agv: 24,
              ech: 4,
              rs: 3,
              sc: 8,
              reefer: 400,
            },
            cableLength: 1200,
          },
          {
            name: 'Container Terminal South',
            type: 'container',
            teu: 800000,
            berths: [
              { segment: 'container_3_6k', calls: 280, hours: 20 },
              { segment: 'container_6_10k', calls: 220, hours: 26 },
              { segment: 'container_6_10k', calls: 200, hours: 28 },
              { segment: 'container_10k_plus', calls: 150, hours: 32 },
            ],
            equipment: {
              sts: 6,
              rtg: 18,
              tt: 30,
              ech: 6,
              rs: 4,
              reefer: 350,
            },
            cableLength: 1000,
          },
        ],
      },

      mega_hub: {
        terminals: [
          {
            name: 'Automated Terminal Alpha',
            type: 'container',
            teu: 2000000,
            berths: [
              { segment: 'container_10k_plus', calls: 320, hours: 30 },
              { segment: 'container_10k_plus', calls: 310, hours: 32 },
              { segment: 'container_10k_plus', calls: 300, hours: 32 },
              { segment: 'container_10k_plus', calls: 290, hours: 34 },
              { segment: 'container_10k_plus', calls: 280, hours: 34 },
            ],
            equipment: {
              sts: 12,
              asc: 30,
              agv: 50,
              ech: 6,
              rs: 4,
              reefer: 600,
            },
            cableLength: 1800,
          },
          {
            name: 'Automated Terminal Beta',
            type: 'container',
            teu: 1800000,
            berths: [
              { segment: 'container_6_10k', calls: 280, hours: 26 },
              { segment: 'container_10k_plus', calls: 300, hours: 30 },
              { segment: 'container_10k_plus', calls: 290, hours: 32 },
              { segment: 'container_10k_plus', calls: 280, hours: 32 },
              { segment: 'container_10k_plus', calls: 270, hours: 34 },
            ],
            equipment: {
              sts: 10,
              asc: 25,
              agv: 40,
              ech: 5,
              rs: 3,
              reefer: 500,
            },
            cableLength: 1600,
          },
          {
            name: 'Conventional Terminal',
            type: 'container',
            teu: 1200000,
            berths: [
              { segment: 'container_3_6k', calls: 320, hours: 18 },
              { segment: 'container_6_10k', calls: 260, hours: 24 },
              { segment: 'container_6_10k', calls: 240, hours: 26 },
              { segment: 'container_6_10k', calls: 220, hours: 28 },
              { segment: 'container_10k_plus', calls: 180, hours: 30 },
              { segment: 'container_10k_plus', calls: 160, hours: 32 },
            ],
            equipment: {
              sts: 10,
              rmg: 24,
              tt: 50,
              sc: 20,
              ech: 8,
              rs: 6,
              reefer: 450,
            },
            cableLength: 1400,
          },
        ],
      },
    }

    const portDef = portConfigs[port.size_key]
    if (!portDef) return

    const newTerminals: PieceTerminalConfig[] = portDef.terminals.map((termDef) => {
      terminalCounter++

      // Create berths with realistic data
      const berths = termDef.berths.map((berthDef, idx) => ({
        id: crypto.randomUUID(),
        berth_number: idx + 1,
        berth_name: `Berth ${idx + 1}`,
        vessel_segment_key: berthDef.segment,
        annual_calls: berthDef.calls,
        avg_berth_hours: berthDef.hours,
        ops_enabled: true,
        dc_enabled: false,
      }))

      return {
        id: crypto.randomUUID(),
        name: termDef.name,
        terminal_type: termDef.type,
        annual_teu: termDef.teu,
        berths,
        baseline_equipment: { ...termDef.equipment },
        scenario_equipment: { ...termDef.equipment },
        cable_length_m: termDef.cableLength,
      }
    })

    setTerminals(newTerminals)
    setResult(null)
  }, [port.size_key])

  // Calculate
  const handleCalculate = async () => {
    setLoading(true)
    setError(null)

    try {
      const body: PieceCalculationRequest = { port, terminals }

      const response = await fetch('/api/piece/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        setError(data.error || 'Calculation failed')
        setResult(null)
      } else {
        setResult(data.result)
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An error occurred'
      setError(message)
      setResult(null)
    }

    setLoading(false)
  }

  // Validation
  const canCalculate =
    terminals.length > 0 &&
    terminals.some(
      (t) =>
        t.annual_teu > 0 &&
        (Object.values(t.baseline_equipment).some((q) => q > 0) ||
          Object.values(t.scenario_equipment).some((q) => q > 0) ||
          t.berths.length > 0)
    )

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <div className="py-14" style={{ backgroundColor: '#e8f8fc' }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8 text-center">
          <h1 className="text-4xl font-extralight text-[#414141] mb-3 tracking-tight">
            PIECE Tool
          </h1>
          <p className="text-sm font-light text-[#585858] max-w-2xl mx-auto">
            Port Infrastructure for Electric &amp; Clean Energy. Configure terminals with
            throughput-based calculations, berth-by-berth OPS, charger infrastructure,
            and grid modeling.
          </p>
        </div>
      </div>

      <div className="py-10" style={{ backgroundColor: '#f2f2f2' }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8 space-y-8">
          {/* Port identity */}
          <PortIdentitySection
            port={port}
            onChange={setPort}
            onLoadDefaults={loadTypicalValues}
          />

          {/* Terminals */}
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-[11px] font-bold uppercase tracking-widest text-[#8c8c8c]">
                Terminals ({terminals.length})
              </h2>
              <button
                type="button"
                onClick={addTerminal}
                className="px-4 py-2 rounded-lg bg-[#3c5e86] text-white text-xs font-semibold hover:bg-[#2a4566] transition-colors"
              >
                + Add Terminal
              </button>
            </div>

            {terminals.map((terminal, idx) => (
              <PieceTerminalCard
                key={terminal.id}
                terminal={terminal}
                onChange={(updated) => updateTerminal(terminal.id, updated)}
                onRemove={() => removeTerminal(terminal.id)}
                canRemove={terminals.length > 1}
                defaultCollapsed={terminals.length > 2 && idx > 0}
              />
            ))}
          </section>

          {/* Calculate button */}
          <div className="flex justify-center">
            <button
              onClick={handleCalculate}
              disabled={loading || !canCalculate}
              className="text-white font-medium text-sm py-3 px-12 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#2e4a6a]"
              style={{ backgroundColor: '#3c5e86' }}
            >
              {loading ? 'Calculating...' : 'Calculate PIECE Analysis'}
            </button>
          </div>

          {/* Error */}
          {error && (
            <div
              className="rounded-2xl text-[#9e5858] px-5 py-4 text-sm border"
              style={{ backgroundColor: '#feeeea', borderColor: '#fac8c2' }}
            >
              <p className="font-medium">{error}</p>
            </div>
          )}

          {/* Empty state */}
          {!result && !error && canCalculate && (
            <div className="bg-white rounded-2xl p-12 border border-[#dcdcdc] text-center">
              <div className="text-[#bebebe] text-5xl mb-4">&#9889;</div>
              <p className="text-sm text-[#8c8c8c]">
                Configure your terminals above and click Calculate to see PIECE analysis
              </p>
            </div>
          )}

          {/* Results */}
          {result && <PieceResultsSection result={result} />}
        </div>
      </div>
    </div>
  )
}
