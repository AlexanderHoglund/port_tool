'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { loadProject, listScenarios, deleteScenario, duplicateScenario, loadScenario as loadScenarioRow } from '@/lib/piece-projects'
import { usePieceContext } from '../../context/PieceContext'
import type { ProjectRow, ScenarioSummary } from '@/lib/types'

const SIZE_LABELS: Record<string, string> = {
  small_feeder: 'Small Feeder',
  regional: 'Regional',
  hub: 'Hub',
  mega_hub: 'Mega Hub',
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

export default function ProjectDetailPage() {
  const router = useRouter()
  const params = useParams()
  const projectId = params.projectId as string
  const { loadProject: loadProjectIntoContext, loadProjectScenario } = usePieceContext()

  const [project, setProject] = useState<ProjectRow | null>(null)
  const [scenarios, setScenarios] = useState<ScenarioSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loadingScenarioId, setLoadingScenarioId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [proj, scens] = await Promise.all([
        loadProject(projectId),
        listScenarios(projectId),
      ])
      setProject(proj)
      setScenarios(scens)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load project')
    }
    setLoading(false)
  }, [projectId])

  useEffect(() => { fetchData() }, [fetchData])

  // Load scenario into dashboard
  const handleLoadScenario = async (scenarioId: string) => {
    if (!project) return
    setLoadingScenarioId(scenarioId)
    try {
      const scenarioRow = await loadScenarioRow(scenarioId)
      loadProjectScenario(project, scenarioRow)
      router.push('/piece')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load scenario')
      setLoadingScenarioId(null)
    }
  }

  // Load project baseline (no scenario)
  const handleEditBaseline = () => {
    if (!project) return
    loadProjectIntoContext(project)
    router.push('/piece')
  }

  // Delete scenario
  const handleDeleteScenario = async (id: string) => {
    setDeletingId(id)
    try {
      await deleteScenario(id)
      setScenarios((prev) => prev.filter((s) => s.id !== id))
      setConfirmDeleteId(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete scenario')
    }
    setDeletingId(null)
  }

  // Duplicate scenario
  const handleDuplicateScenario = async (id: string, name: string) => {
    setDuplicatingId(id)
    try {
      await duplicateScenario(id, `${name} (Copy)`)
      // Refresh scenario list
      const scens = await listScenarios(projectId)
      setScenarios(scens)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to duplicate scenario')
    }
    setDuplicatingId(null)
  }

  if (loading) {
    return (
      <div className="py-8">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
            <div className="text-sm text-[#8c8c8c]">Loading project...</div>
          </div>
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="py-8">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
            <h2 className="text-xl font-semibold text-[#414141] mb-2">Project not found</h2>
            <a href="/piece/projects" className="text-sm text-[#3c5e86] hover:underline">
              Back to Projects
            </a>
          </div>
        </div>
      </div>
    )
  }

  const terminalNames = project.baseline_config.terminals.map((t) => t.name).join(', ')

  return (
    <div className="py-8">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        {/* Breadcrumb */}
        <div className="mb-4">
          <a href="/piece/projects" className="text-xs text-[#3c5e86] hover:underline">
            &larr; All Projects
          </a>
        </div>

        {/* Error */}
        {error && (
          <div
            className="mb-6 rounded-xl px-5 py-4 text-sm border"
            style={{ backgroundColor: '#feeeea', borderColor: '#fac8c2', color: '#9e5858' }}
          >
            {error}
            <button onClick={() => setError(null)} className="ml-2 underline text-xs">dismiss</button>
          </div>
        )}

        {/* Project header */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-xl font-semibold text-[#414141]">{project.project_name}</h1>
                {project.port_size_key && (
                  <span className="text-[10px] font-medium uppercase tracking-wider bg-gray-100 text-[#8c8c8c] px-2 py-0.5 rounded">
                    {SIZE_LABELS[project.port_size_key] ?? project.port_size_key}
                  </span>
                )}
              </div>
              {project.description && (
                <p className="text-sm text-[#8c8c8c] mb-3">{project.description}</p>
              )}
              <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-[#8c8c8c]">
                {project.port_name && (
                  <span>
                    <span className="font-medium text-[#5a5a5a]">{project.port_name}</span>
                    {project.port_location ? `, ${project.port_location}` : ''}
                  </span>
                )}
                <span>{project.terminal_count} terminal{project.terminal_count !== 1 ? 's' : ''}: {terminalNames}</span>
                <span className="text-[#bebebe]">Updated {formatDate(project.updated_at)}</span>
              </div>
            </div>
            <button
              onClick={handleEditBaseline}
              className="px-4 py-2 rounded-lg border border-[#bebebe] text-sm font-medium text-[#414141] hover:bg-gray-50 transition-colors shrink-0"
            >
              Edit Baseline
            </button>
          </div>
        </div>

        {/* Scenarios header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-[#414141]">
            Scenarios ({scenarios.length})
          </h2>
          <div className="flex items-center gap-2">
          </div>
        </div>

        {/* Scenarios */}
        {scenarios.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
            <div className="text-[#bebebe] text-4xl mb-3">&#9889;</div>
            <h3 className="text-base font-semibold text-[#414141] mb-2">No scenarios yet</h3>
            <p className="text-sm text-[#8c8c8c] max-w-md mx-auto mb-6">
              Edit the baseline on the Dashboard, configure an electrification scenario, and save it to create your first scenario.
            </p>
            <button
              onClick={handleEditBaseline}
              className="px-6 py-2.5 rounded-lg bg-[#414141] text-white text-sm font-semibold hover:bg-[#585858] transition-colors"
            >
              Open Dashboard
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {scenarios.map((scenario) => (
              <div
                key={scenario.id}
                className="bg-white rounded-xl border border-gray-200 hover:border-gray-300 transition-colors overflow-hidden"
              >
                <div className="px-6 py-5 flex items-center gap-6">
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1.5">
                      <h3 className="text-base font-semibold text-[#414141] truncate">
                        {scenario.scenario_name}
                      </h3>
                      {scenario.has_result ? (
                        <span className="shrink-0 text-[10px] font-medium bg-green-100 text-green-700 px-2 py-0.5 rounded">
                          Calculated
                        </span>
                      ) : (
                        <span className="shrink-0 text-[10px] font-medium bg-gray-100 text-[#8c8c8c] px-2 py-0.5 rounded">
                          Draft
                        </span>
                      )}
                    </div>

                    {scenario.description && (
                      <p className="text-sm text-[#8c8c8c] mb-2 truncate">{scenario.description}</p>
                    )}

                    <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-[#8c8c8c]">
                      {scenario.total_capex_usd !== undefined && (
                        <span>CAPEX: <span className="font-medium text-[#414141]">{formatCurrency(scenario.total_capex_usd)}</span></span>
                      )}
                      {scenario.co2_reduction_percent !== undefined && (
                        <span>CO2: <span className="font-medium text-[#286464]">-{scenario.co2_reduction_percent.toFixed(1)}%</span></span>
                      )}
                      {scenario.annual_opex_savings_usd !== undefined && (
                        <span>OPEX savings: <span className="font-medium text-[#286464]">{formatCurrency(scenario.annual_opex_savings_usd)}/yr</span></span>
                      )}
                      <span className="text-[#bebebe]">{formatDate(scenario.updated_at)}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleLoadScenario(scenario.id)}
                      disabled={loadingScenarioId === scenario.id}
                      className="px-5 py-2 rounded-lg bg-[#414141] text-white text-sm font-medium hover:bg-[#585858] disabled:opacity-50 transition-colors"
                    >
                      {loadingScenarioId === scenario.id ? 'Loading...' : 'Load'}
                    </button>

                    <button
                      onClick={() => handleDuplicateScenario(scenario.id, scenario.scenario_name)}
                      disabled={duplicatingId === scenario.id}
                      className="px-3 py-2 rounded-lg text-sm text-[#8c8c8c] hover:text-[#3c5e86] hover:bg-blue-50 transition-colors"
                      title="Duplicate scenario"
                    >
                      {duplicatingId === scenario.id ? '...' : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      )}
                    </button>

                    {confirmDeleteId === scenario.id ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleDeleteScenario(scenario.id)}
                          disabled={deletingId === scenario.id}
                          className="px-3 py-2 rounded-lg text-sm font-medium text-white bg-[#9e5858] hover:bg-red-700 disabled:opacity-50 transition-colors"
                        >
                          {deletingId === scenario.id ? '...' : 'Confirm'}
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
                        onClick={() => setConfirmDeleteId(scenario.id)}
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
