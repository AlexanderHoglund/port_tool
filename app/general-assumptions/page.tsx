'use client'

import { useState, useEffect, useCallback } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { ASSUMPTION_TABLES, HIDDEN_COLUMNS, type AssumptionTableKey } from '@/lib/constants'

const TAB_COLORS: Record<AssumptionTableKey, string> = {
  economic_assumptions: '#7bc47f',
  piece_equipment: '#e8c547',
  piece_evse: '#e8a0a0',
  piece_fleet_ops: '#7aafe0',
  piece_grid: '#c49edb',
}

export default function GeneralAssumptionsPage() {
  const [activeTable, setActiveTable] = useState<AssumptionTableKey>('economic_assumptions')
  const [data, setData] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const activeTableInfo = ASSUMPTION_TABLES.find((t) => t.key === activeTable)!

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    setData([])

    const { data: tableData, error: tableError } = await supabase
      .from(activeTable)
      .select('*')
      .order('display_name', { ascending: true })

    if (tableError) {
      setError(tableError.message)
      setData([])
    } else {
      setData(tableData ?? [])
    }
    setLoading(false)
  }, [activeTable])

  useEffect(() => { fetchData() }, [fetchData])

  const columns = data.length > 0
    ? Object.keys(data[0]).filter((col) => !HIDDEN_COLUMNS.includes(col))
    : []

  const formatHeader = (col: string) =>
    col.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

  const formatCell = (value: unknown): string => {
    if (value === null || value === undefined) return '\u2014'
    if (typeof value === 'number') {
      if (Number.isInteger(value)) return value.toLocaleString()
      return value.toLocaleString(undefined, { maximumFractionDigits: 6 })
    }
    return String(value)
  }

  return (
    <div className="py-10">
      <div className="max-w-[1400px] mx-auto px-5 lg:px-8">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-[30px] sm:text-[40px] font-extralight text-[#2c3e50] leading-tight tracking-[-0.02em] mb-3">
            Useful Data
          </h1>
          <p className="text-[15px] text-[#6b7280] max-w-2xl leading-relaxed">
            Default values used by the PiECE Tool. These can be customised per scenario within the tool.
          </p>
        </div>

        {/* Table selector — horizontal tabs with colored diamonds */}
        <div className="border-b border-gray-200 mb-8">
          <div className="flex gap-0 -mb-px overflow-x-auto">
            {ASSUMPTION_TABLES.map((table) => {
              const color = TAB_COLORS[table.key]
              const active = activeTable === table.key
              return (
                <button
                  key={table.key}
                  onClick={() => setActiveTable(table.key)}
                  className={`flex items-center gap-2.5 px-5 py-3.5 text-[13px] font-medium whitespace-nowrap border-b-2 transition-colors ${
                    active
                      ? 'text-[#2c3e50]'
                      : 'border-transparent text-[#9ca3af] hover:text-[#6b7280]'
                  }`}
                  style={{ borderBottomColor: active ? color : undefined }}
                >
                  <span
                    className="w-3 h-3 rotate-45 rounded-[2px] shrink-0"
                    style={{
                      backgroundColor: active ? color : `${color}50`,
                      border: `1.5px solid ${color}`,
                    }}
                  />
                  {table.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Table description */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-[13px] text-[#9ca3af]">
            {activeTableInfo.description}
          </p>
          {data.length > 0 && (
            <span className="text-[12px] text-[#9ca3af] shrink-0 ml-4">
              {data.length} entries
            </span>
          )}
        </div>

        {/* Table content */}
        {loading ? (
          <div className="py-20 text-center">
            <div className="text-[13px] text-[#9ca3af]">Loading...</div>
          </div>
        ) : error ? (
          <div className="py-8">
            <div className="rounded-xl text-[#9e5858] px-5 py-4 text-sm border"
              style={{ backgroundColor: '#feeeea', borderColor: '#fac8c2' }}>
              {error}
              <button onClick={() => setError(null)} className="ml-2 underline text-xs">dismiss</button>
            </div>
          </div>
        ) : data.length === 0 ? (
          <div className="py-20 text-center">
            <div className="text-[13px] text-[#9ca3af]">No data found</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="w-8 border-b border-gray-200" />
                  {columns.map((col) => (
                    <th
                      key={col}
                      className="px-5 py-4 text-left text-[11px] font-medium uppercase tracking-[0.08em] text-[#9ca3af] border-b border-gray-200"
                    >
                      {formatHeader(col)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((row, i) => {
                  const color = TAB_COLORS[activeTable]
                  return (
                    <tr
                      key={i}
                      className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50/40 transition-colors"
                    >
                      <td className="w-8 pl-5 py-4">
                        <span
                          className="block w-2.5 h-2.5 rotate-45 rounded-[1px]"
                          style={{
                            backgroundColor: `${color}60`,
                            border: `1px solid ${color}`,
                          }}
                        />
                      </td>
                      {columns.map((col, colIdx) => (
                        <td
                          key={col}
                          className={`px-5 py-4 whitespace-nowrap text-[13px] ${
                            colIdx === 0
                              ? 'text-[#2c3e50] font-medium'
                              : 'text-[#6b7280]'
                          }`}
                        >
                          {formatCell(row[col])}
                        </td>
                      ))}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Info note */}
        <div className="mt-10 border-t border-gray-200 pt-8">
          <p className="text-[13px] text-[#9ca3af] leading-relaxed max-w-2xl">
            These are the default values used by all PiECE Tool calculations.
            To customise assumptions for a specific scenario, open the{' '}
            <a href="/piece/assumptions" className="text-[#2c3e50] underline underline-offset-2">Assumptions page</a>{' '}
            within the PiECE Tool.
          </p>
        </div>
      </div>
    </div>
  )
}
