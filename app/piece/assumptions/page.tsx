'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Image from 'next/image'
import { createBrowserClient } from '@supabase/ssr'
import type { PieceAssumptionOverride, PieceCalculationRequest } from '@/lib/types'
import { ASSUMPTION_TABLES, HIDDEN_COLUMNS, NON_EDITABLE_COLUMNS, type AssumptionTableKey } from '@/lib/constants'
import { usePieceContext } from '../context/PieceContext'
import { loadProject, listScenarios, loadScenario, updateScenario } from '@/lib/piece-projects'
import { reconstitutePieceTerminals } from '@/lib/piece-reconstitute'
import { computeAssumptionFingerprint } from '@/lib/assumption-hash'

export default function AssumptionsPage() {
  const { refreshAssumptionFingerprint, activeAssumptionProfile, activeScenarioName, activeProjectId, activeProjectName, activeScenarioId, setResult, currentAssumptionFingerprint } = usePieceContext()
  const PROFILE_NAME = activeAssumptionProfile
  const [activeTable, setActiveTable] = useState<AssumptionTableKey>('economic_assumptions')
  const [data, setData] = useState<Record<string, unknown>[]>([])
  const [overrides, setOverrides] = useState<PieceAssumptionOverride[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingCell, setEditingCell] = useState<{ rowKey: string; col: string } | null>(null)
  const [editValue, setEditValue] = useState('')
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Recalculate all scenarios state
  const [recalculating, setRecalculating] = useState(false)
  const [recalcResult, setRecalcResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const activeTableInfo = ASSUMPTION_TABLES.find((t) => t.key === activeTable)!

  // Fetch table data + overrides
  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    setEditingCell(null)
    setData([])  // Clear stale data immediately to prevent key mismatch during table switch

    const [tableRes, overridesRes] = await Promise.all([
      supabase.from(activeTable).select('*').order('display_name', { ascending: true }),
      supabase
        .from('piece_assumption_overrides')
        .select('*')
        .eq('profile_name', PROFILE_NAME)
        .eq('table_name', activeTable),
    ])

    if (tableRes.error) {
      setError(tableRes.error.message)
      setData([])
      setOverrides([])
    } else {
      setData(tableRes.data ?? [])
      setOverrides((overridesRes.data ?? []) as PieceAssumptionOverride[])
    }
    setLoading(false)
  }, [activeTable, PROFILE_NAME])

  useEffect(() => { fetchData() }, [fetchData])

  // Focus input when editing starts
  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editingCell])

  // Get visible columns
  const columns = data.length > 0
    ? Object.keys(data[0]).filter((col) => !HIDDEN_COLUMNS.includes(col))
    : []

  const formatHeader = (col: string) =>
    col.replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .replace(/\bLiters?\b/g, (m) => m.toLowerCase())

  const formatCell = (value: unknown): string => {
    if (value === null || value === undefined) return '-'
    if (typeof value === 'number') {
      if (Number.isInteger(value)) return value.toLocaleString()
      return value.toLocaleString(undefined, { maximumFractionDigits: 6 })
    }
    return String(value)
  }

  const isEditable = (col: string): boolean => {
    if (NON_EDITABLE_COLUMNS.includes(col)) return false
    // Only numeric columns are editable — check any row (some may be null)
    if (data.length === 0) return false
    return data.some((row) => typeof row[col] === 'number')
  }

  const getRowKey = (row: Record<string, unknown>): string => {
    return String(row[activeTableInfo.rowKeyCol] ?? row['id'] ?? '')
  }

  // Check if a cell has an override
  const getOverride = (rowKey: string, col: string): PieceAssumptionOverride | undefined => {
    return overrides.find(
      (o) => o.row_key === rowKey && o.column_name === col
    )
  }

  // Get the display value for a cell (override if exists, else default)
  const getCellValue = (row: Record<string, unknown>, col: string): unknown => {
    const rowKey = getRowKey(row)
    const override = getOverride(rowKey, col)
    if (override) return override.custom_value
    return row[col]
  }

  // Start editing a cell
  const startEditing = (rowKey: string, col: string, currentValue: unknown) => {
    setEditingCell({ rowKey, col })
    setEditValue(currentValue === null || currentValue === undefined ? '' : String(currentValue))
  }

  // Save an override
  const saveOverride = async () => {
    if (!editingCell) return
    const { rowKey, col } = editingCell

    const numValue = parseFloat(editValue)
    if (isNaN(numValue)) {
      setEditingCell(null)
      return
    }

    // Check if value matches the default — if so, delete any existing override instead
    const defaultRow = data.find((r) => getRowKey(r) === rowKey)
    if (defaultRow && defaultRow[col] === numValue) {
      await deleteOverride(rowKey, col)
      setEditingCell(null)
      return
    }

    setSaving(true)
    const { error: upsertError } = await supabase
      .from('piece_assumption_overrides')
      .upsert(
        {
          profile_name: PROFILE_NAME,
          table_name: activeTable,
          row_key: rowKey,
          column_name: col,
          custom_value: numValue,
        },
        { onConflict: 'profile_name,table_name,row_key,column_name' }
      )

    if (upsertError) {
      setError(`Failed to save: ${upsertError.message}`)
    } else {
      // Refresh overrides
      const { data: refreshed } = await supabase
        .from('piece_assumption_overrides')
        .select('*')
        .eq('profile_name', PROFILE_NAME)
        .eq('table_name', activeTable)
      setOverrides((refreshed ?? []) as PieceAssumptionOverride[])
      await refreshAssumptionFingerprint()
    }
    setSaving(false)
    setEditingCell(null)
  }

  // Delete a single override (reset to default)
  const deleteOverride = async (rowKey: string, col: string) => {
    const { error: delError } = await supabase
      .from('piece_assumption_overrides')
      .delete()
      .eq('profile_name', PROFILE_NAME)
      .eq('table_name', activeTable)
      .eq('row_key', rowKey)
      .eq('column_name', col)

    if (delError) {
      setError(`Failed to reset: ${delError.message}`)
    } else {
      setOverrides((prev) =>
        prev.filter((o) => !(o.row_key === rowKey && o.column_name === col))
      )
      await refreshAssumptionFingerprint()
    }
  }

  // Reset all overrides for current table
  const resetAllOverrides = async () => {
    if (overrides.length === 0) return

    const { error: delError } = await supabase
      .from('piece_assumption_overrides')
      .delete()
      .eq('profile_name', PROFILE_NAME)
      .eq('table_name', activeTable)

    if (delError) {
      setError(`Failed to reset all: ${delError.message}`)
    } else {
      setOverrides([])
      await refreshAssumptionFingerprint()
    }
  }

  // Count overrides per table (for sidebar badges)
  const [overrideCounts, setOverrideCounts] = useState<Record<string, number>>({})
  useEffect(() => {
    async function fetchCounts() {
      const { data: allOverrides } = await supabase
        .from('piece_assumption_overrides')
        .select('table_name')
        .eq('profile_name', PROFILE_NAME)
      if (allOverrides) {
        const counts: Record<string, number> = {}
        for (const o of allOverrides) {
          counts[o.table_name] = (counts[o.table_name] || 0) + 1
        }
        setOverrideCounts(counts)
      }
    }
    fetchCounts()
  }, [overrides])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveOverride()
    } else if (e.key === 'Escape') {
      setEditingCell(null)
    }
  }

  const totalOverrides = Object.values(overrideCounts).reduce((a, b) => a + b, 0)

  // ── Recalculate all scenarios ──
  const handleRecalculateAll = async () => {
    if (!activeProjectId) return
    setRecalculating(true)
    setRecalcResult(null)

    try {
      // Load project baseline
      const project = await loadProject(activeProjectId)
      const scenarios = await listScenarios(activeProjectId)

      let successCount = 0
      let errorCount = 0

      for (const summary of scenarios) {
        try {
          const scenarioRow = await loadScenario(summary.id)
          const { terminals, portServicesBaseline, portServicesScenario } = reconstitutePieceTerminals(
            project.baseline_config,
            scenarioRow.scenario_config,
          )

          const body: PieceCalculationRequest = {
            port: project.port_config,
            terminals,
            port_services_baseline: portServicesBaseline ?? undefined,
            port_services_scenario: portServicesScenario ?? undefined,
            assumption_profile: scenarioRow.assumption_profile,
          }

          const response = await fetch('/api/piece/calculate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          })

          const data = await response.json()

          if (response.ok && data.success) {
            // Compute fingerprint for this scenario's profile
            const fingerprint = await computeAssumptionFingerprint(scenarioRow.assumption_profile)
            await updateScenario(summary.id, {
              result: data.result,
              assumption_hash: fingerprint,
            })

            // If this is the active scenario, update the context result
            if (summary.id === activeScenarioId) {
              setResult(data.result, fingerprint)
            }

            successCount++
          } else {
            errorCount++
          }
        } catch {
          errorCount++
        }
      }

      // Refresh the context fingerprint so stale detection sees the new hash
      await refreshAssumptionFingerprint()

      if (errorCount === 0) {
        setRecalcResult({ type: 'success', message: `Recalculated ${successCount} scenario${successCount !== 1 ? 's' : ''} successfully.` })
      } else {
        setRecalcResult({ type: 'error', message: `${successCount} succeeded, ${errorCount} failed.` })
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to recalculate'
      setRecalcResult({ type: 'error', message })
    }

    setRecalculating(false)
  }

  return (
    <>
      <div className="py-8">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          {/* Scenario indicator */}
          {activeScenarioName && PROFILE_NAME !== 'default' && (
            <div className="mb-4 bg-[#eef5fc] border border-[#c5ddf0] rounded-xl px-5 py-3 flex items-center justify-between">
              <p className="text-sm text-[#3c5e86]">
                Editing assumptions for: <span className="font-semibold">{activeScenarioName}</span>
              </p>
              <span className="text-[10px] text-[#8c8c8c]">
                Profile: {PROFILE_NAME}
              </span>
            </div>
          )}
          <div className="flex gap-6">
            {/* Sidebar */}
            <div className="w-64 shrink-0">
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 bg-[#414141]">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-white">
                    Data Tables
                  </h3>
                </div>
                <div className="divide-y divide-gray-100">
                  {ASSUMPTION_TABLES.map((table) => (
                    <button
                      key={table.key}
                      onClick={() => setActiveTable(table.key)}
                      className={`w-full text-left px-4 py-3 transition-colors ${
                        activeTable === table.key
                          ? 'bg-gray-50 border-l-3 border-l-[#3c5e86]'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`flex items-center gap-2 text-sm font-medium ${
                          activeTable === table.key ? 'text-[#3c5e86]' : 'text-[#414141]'
                        }`}>
                          <Image
                            src={table.icon}
                            alt=""
                            width={18}
                            height={18}
                            className={activeTable === table.key ? 'opacity-60' : 'opacity-35'}
                          />
                          {table.label}
                        </span>
                        {(overrideCounts[table.key] ?? 0) > 0 && (
                          <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">
                            {overrideCounts[table.key]}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-[#8c8c8c] mt-0.5 line-clamp-2">
                        {table.description}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 min-w-0">
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-[#414141]">
                      {activeTableInfo.label}
                    </h2>
                    <p className="text-xs text-[#8c8c8c] mt-0.5">
                      {activeTableInfo.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-[#8c8c8c] bg-gray-100 px-3 py-1 rounded-full">
                      {data.length} rows
                    </span>
                    {overrides.length > 0 && (
                      <button
                        onClick={resetAllOverrides}
                        className="text-xs font-medium text-[#9e5858] hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1 rounded-full transition-colors"
                      >
                        Reset All ({overrides.length})
                      </button>
                    )}
                  </div>
                </div>

                {loading ? (
                  <div className="p-12 text-center">
                    <div className="text-sm text-[#8c8c8c]">Loading data...</div>
                  </div>
                ) : error ? (
                  <div className="p-6">
                    <div className="rounded-lg text-[#9e5858] px-4 py-3 text-sm border"
                      style={{ backgroundColor: '#feeeea', borderColor: '#fac8c2' }}>
                      {error}
                      <button onClick={() => setError(null)} className="ml-2 underline text-xs">dismiss</button>
                    </div>
                  </div>
                ) : data.length === 0 ? (
                  <div className="p-12 text-center">
                    <div className="text-sm text-[#8c8c8c]">No data found</div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          {columns.map((col) => {
                            const colEditable = isEditable(col)
                            return (
                              <th
                                key={col}
                                className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${
                                  colEditable ? 'text-[#3c5e86]' : 'text-[#8c8c8c]'
                                }`}
                              >
                                <span className="flex items-center gap-1.5">
                                  {formatHeader(col)}
                                  {colEditable && (
                                    <svg className="w-3 h-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                    </svg>
                                  )}
                                </span>
                              </th>
                            )
                          })}
                          <th className="px-3 py-3 w-10" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {data.map((row) => {
                          const rowKey = getRowKey(row)
                          return (
                            <tr key={rowKey} className="hover:bg-gray-50/50 transition-colors">
                              {columns.map((col) => {
                                const override = getOverride(rowKey, col)
                                const displayValue = getCellValue(row, col)
                                const editable = isEditable(col)
                                const isEditing = editingCell?.rowKey === rowKey && editingCell?.col === col

                                if (isEditing) {
                                  return (
                                    <td key={col} className="px-3 py-1.5">
                                      <input
                                        ref={inputRef}
                                        type="number"
                                        step="any"
                                        value={editValue}
                                        onChange={(e) => setEditValue(e.target.value)}
                                        onBlur={saveOverride}
                                        onKeyDown={handleKeyDown}
                                        disabled={saving}
                                        className="w-full px-2 py-1.5 text-sm border-2 border-blue-400 rounded-md outline-none bg-blue-50/30"
                                      />
                                    </td>
                                  )
                                }

                                return (
                                  <td
                                    key={col}
                                    className={`px-4 py-3 whitespace-nowrap transition-colors ${
                                      override
                                        ? 'bg-blue-50/60'
                                        : editable
                                        ? 'bg-[#f8fafc] hover:bg-blue-50/40 cursor-pointer'
                                        : ''
                                    }`}
                                    onClick={editable ? () => startEditing(rowKey, col, displayValue) : undefined}
                                    title={
                                      override
                                        ? `Custom value (default: ${formatCell(row[col])})`
                                        : editable
                                        ? 'Click to edit'
                                        : undefined
                                    }
                                  >
                                    <span className={`${
                                      override
                                        ? 'text-blue-700 font-medium'
                                        : editable
                                        ? 'text-[#3c5e86]'
                                        : 'text-[#414141]'
                                    }`}>
                                      {formatCell(displayValue)}
                                    </span>
                                    {override && (
                                      <span className="ml-1.5 text-[10px] text-blue-400">
                                        (was {formatCell(row[col])})
                                      </span>
                                    )}
                                  </td>
                                )
                              })}
                              {/* Reset button column */}
                              <td className="px-3 py-3">
                                {overrides.some((o) => o.row_key === rowKey) && (
                                  <button
                                    onClick={() => {
                                      const rowOverrides = overrides.filter((o) => o.row_key === rowKey)
                                      Promise.all(rowOverrides.map((o) => deleteOverride(o.row_key, o.column_name)))
                                    }}
                                    className="text-[10px] text-[#8c8c8c] hover:text-[#9e5858] transition-colors"
                                    title="Reset row to defaults"
                                  >
                                    reset
                                  </button>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Info Banner */}
              <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 px-5 py-3 flex items-start gap-3">
                <svg className="w-4 h-4 text-[#3c5e86] mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                <p className="text-sm text-[#3c5e86]">
                  <span className="font-semibold">Columns with the pencil icon are editable</span> — click any
                  highlighted cell to customize its value. Custom values appear in blue with the original in
                  parentheses. Use &quot;Reset&quot; to revert changes. Default database values are never modified.
                </p>
              </div>

              {/* Recalculate Project Button */}
              {activeProjectId && (
                <div className="mt-6 rounded-xl border border-gray-200 bg-white px-6 py-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-[#414141]">
                        Recalculate Project
                      </h3>
                      <p className="text-xs text-[#8c8c8c] mt-0.5">
                        Recalculate all scenarios for <span className="font-medium text-[#555]">{activeProjectName}</span> using current assumptions.
                      </p>
                    </div>
                    <button
                      onClick={handleRecalculateAll}
                      disabled={recalculating}
                      className="px-6 py-2.5 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-[#3c5e86] hover:bg-[#2d4a6e]"
                    >
                      {recalculating ? 'Recalculating...' : 'Recalculate All Scenarios'}
                    </button>
                  </div>
                  {recalcResult && (
                    <div className={`mt-3 text-xs font-medium ${
                      recalcResult.type === 'success' ? 'text-green-700' : 'text-red-600'
                    }`}>
                      {recalcResult.message}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
