'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { listSavedPorts, loadSavedPort, deleteSavedPort, type SavedPortSummary } from '@/lib/piece-saved-ports'
import { usePieceContext } from '../context/PieceContext'

const SIZE_LABELS: Record<string, string> = {
  small: 'Small',
  medium: 'Medium',
  large: 'Large',
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatCurrency(val?: number): string {
  if (val === undefined || val === null) return '-'
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`
  if (val >= 1_000) return `$${(val / 1_000).toFixed(0)}K`
  return `$${val.toFixed(0)}`
}

export default function SavedPortsPage() {
  const router = useRouter()
  const { loadScenario } = usePieceContext()
  const [ports, setPorts] = useState<SavedPortSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const fetchPorts = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await listSavedPorts()
      setPorts(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load saved ports')
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchPorts() }, [fetchPorts])

  const handleLoad = async (id: string) => {
    setLoadingId(id)
    try {
      const row = await loadSavedPort(id)
      loadScenario(row.port_config, row.terminals_config, row.result)
      router.push('/piece')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load scenario')
      setLoadingId(null)
    }
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      await deleteSavedPort(id)
      setPorts((prev) => prev.filter((p) => p.id !== id))
      setConfirmDeleteId(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete scenario')
    }
    setDeletingId(null)
  }

  return (
    <div className="py-8">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-[#414141]">Saved Ports</h1>
            <p className="text-sm text-[#8c8c8c] mt-0.5">
              Load a previously saved scenario to continue working on it
            </p>
          </div>
          <span className="text-xs text-[#8c8c8c] bg-gray-100 px-3 py-1.5 rounded-full">
            {ports.length} scenario{ports.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Error */}
        {error && (
          <div
            className="mb-6 rounded-xl px-5 py-4 text-sm border"
            style={{ backgroundColor: '#feeeea', borderColor: '#fac8c2', color: '#9e5858' }}
          >
            {error}
            <button onClick={() => setError(null)} className="ml-2 underline text-xs">
              dismiss
            </button>
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
            <div className="text-sm text-[#8c8c8c]">Loading saved ports...</div>
          </div>
        ) : ports.length === 0 ? (
          /* Empty state */
          <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-[#8c8c8c]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-[#414141] mb-2">No saved ports yet</h2>
            <p className="text-sm text-[#8c8c8c] max-w-md mx-auto mb-8">
              Run a PIECE analysis on the Dashboard, then click &quot;Save Scenario&quot; to save
              your port configuration and results here for future reference.
            </p>
            <a
              href="/piece"
              className="inline-block px-8 py-3 rounded-xl bg-[#414141] text-white text-sm font-semibold hover:bg-[#585858] transition-colors"
            >
              Go to Dashboard
            </a>
          </div>
        ) : (
          /* Port list */
          <div className="space-y-3">
            {ports.map((port) => (
              <div
                key={port.id}
                className="bg-white rounded-xl border border-gray-200 hover:border-gray-300 transition-colors overflow-hidden"
              >
                <div className="px-6 py-5 flex items-center gap-6">
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1.5">
                      <h3 className="text-base font-semibold text-[#414141] truncate">
                        {port.scenario_name}
                      </h3>
                      {port.port_size_key && (
                        <span className="shrink-0 text-[10px] font-medium uppercase tracking-wider bg-gray-100 text-[#8c8c8c] px-2 py-0.5 rounded">
                          {SIZE_LABELS[port.port_size_key] ?? port.port_size_key}
                        </span>
                      )}
                    </div>

                    {port.description && (
                      <p className="text-sm text-[#8c8c8c] mb-2 truncate">{port.description}</p>
                    )}

                    <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-[#8c8c8c]">
                      {port.port_name && (
                        <span>
                          <span className="font-medium text-[#5a5a5a]">{port.port_name}</span>
                          {port.port_location ? `, ${port.port_location}` : ''}
                        </span>
                      )}
                      <span>
                        {port.terminal_count} terminal{port.terminal_count !== 1 ? 's' : ''}
                      </span>
                      {port.total_capex_usd !== undefined && (
                        <span>CAPEX: {formatCurrency(port.total_capex_usd)}</span>
                      )}
                      {port.co2_reduction_percent !== undefined && (
                        <span>CO2 reduction: {port.co2_reduction_percent.toFixed(1)}%</span>
                      )}
                      <span className="text-[#bebebe]">{formatDate(port.created_at)}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleLoad(port.id)}
                      disabled={loadingId === port.id}
                      className="px-5 py-2 rounded-lg bg-[#414141] text-white text-sm font-medium hover:bg-[#585858] disabled:opacity-50 transition-colors"
                    >
                      {loadingId === port.id ? 'Loading...' : 'Load'}
                    </button>

                    {confirmDeleteId === port.id ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleDelete(port.id)}
                          disabled={deletingId === port.id}
                          className="px-3 py-2 rounded-lg text-sm font-medium text-white bg-[#9e5858] hover:bg-red-700 disabled:opacity-50 transition-colors"
                        >
                          {deletingId === port.id ? '...' : 'Confirm'}
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-3 py-2 rounded-lg text-sm text-[#8c8c8c] hover:text-[#414141] transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(port.id)}
                        className="px-3 py-2 rounded-lg text-sm text-[#8c8c8c] hover:text-[#9e5858] hover:bg-red-50 transition-colors"
                        title="Delete scenario"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
