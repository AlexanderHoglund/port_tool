'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { listProjects, deleteProject, loadProject as loadProjectRow, listScenarios, loadScenario as loadScenarioRow } from '@/lib/piece-projects'
import type { ProjectSummary, ProjectRow } from '@/lib/types'
import NewProjectDialog from '@/components/shipping/NewProjectDialog'
import { usePieceContext } from '@/app/piece/context/PieceContext'

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

export default function ProjectsPage() {
  const router = useRouter()
  const ctx = usePieceContext()
  const [projects, setProjects] = useState<ProjectSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [showNewDialog, setShowNewDialog] = useState(false)
  const [openingId, setOpeningId] = useState<string | null>(null)

  const handleProjectCreated = useCallback((projectRow: ProjectRow) => {
    ctx.loadProject(projectRow)
    router.push('/piece/calculator')
  }, [ctx, router])

  // Open project directly: load best scenario (with results preferred), or just baseline
  const handleOpenProject = async (projectId: string) => {
    setOpeningId(projectId)
    setError(null)
    try {
      const [project, scenarios] = await Promise.all([
        loadProjectRow(projectId),
        listScenarios(projectId),
      ])

      const withResults = scenarios
        .filter((s) => s.has_result)
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      const withoutResults = scenarios
        .filter((s) => !s.has_result)
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      const bestScenario = withResults[0] ?? withoutResults[0] ?? null

      if (bestScenario) {
        const scenarioRow = await loadScenarioRow(bestScenario.id)
        ctx.loadProjectScenario(project, scenarioRow)
      } else {
        ctx.loadProject(project)
      }

      router.push('/piece/calculator')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to open project')
      setOpeningId(null)
    }
  }

  const fetchProjects = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await listProjects()
      setProjects(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load projects')
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchProjects() }, [fetchProjects])

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      await deleteProject(id)
      setProjects((prev) => prev.filter((p) => p.id !== id))
      setConfirmDeleteId(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete project')
    }
    setDeletingId(null)
  }

  return (
    <div className="py-8">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-[#414141]">Projects</h1>
            <p className="text-sm text-[#8c8c8c] mt-0.5">
              Manage your port projects and electrification scenarios
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-[#8c8c8c] bg-gray-100 px-3 py-1.5 rounded-full">
              {projects.length} project{projects.length !== 1 ? 's' : ''}
            </span>
            <button
              onClick={() => setShowNewDialog(true)}
              className="px-4 py-2 rounded-lg bg-[#3c5e86] text-white text-xs font-semibold hover:bg-[#68a4c2] transition-colors"
            >
              + New Project
            </button>
          </div>
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

        {/* Loading */}
        {loading ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
            <div className="text-sm text-[#8c8c8c]">Loading projects...</div>
          </div>
        ) : projects.length === 0 ? (
          /* Empty state */
          <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-[#8c8c8c]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-[#414141] mb-2">No projects yet</h2>
            <p className="text-sm text-[#8c8c8c] max-w-md mx-auto mb-8">
              Create a project to define your port baseline and electrification scenarios.
            </p>
            <button
              onClick={() => setShowNewDialog(true)}
              className="px-8 py-3 rounded-xl bg-[#414141] text-white text-sm font-semibold hover:bg-[#585858] transition-colors"
            >
              Create First Project
            </button>
          </div>
        ) : (
          /* Project list */
          <div className="space-y-3">
            {projects.map((project) => (
              <div
                key={project.id}
                className="bg-white rounded-xl border border-gray-200 hover:border-gray-300 transition-colors overflow-hidden"
              >
                <div className="px-6 py-5 flex items-center gap-6">
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1.5">
                      <h3 className="text-base font-semibold text-[#414141] truncate">
                        {project.project_name}
                      </h3>
                      {project.port_size_key && (
                        <span className="shrink-0 text-[10px] font-medium uppercase tracking-wider bg-gray-100 text-[#8c8c8c] px-2 py-0.5 rounded">
                          {SIZE_LABELS[project.port_size_key] ?? project.port_size_key}
                        </span>
                      )}
                    </div>

                    {project.description && (
                      <p className="text-sm text-[#8c8c8c] mb-2 truncate">{project.description}</p>
                    )}

                    <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-[#8c8c8c]">
                      {project.port_name && (
                        <span>
                          <span className="font-medium text-[#5a5a5a]">{project.port_name}</span>
                          {project.port_location ? `, ${project.port_location}` : ''}
                        </span>
                      )}
                      <span>
                        {project.terminal_count} terminal{project.terminal_count !== 1 ? 's' : ''}
                      </span>
                      <span className="font-medium text-[#286464]">
                        {project.scenario_count} scenario{project.scenario_count !== 1 ? 's' : ''}
                      </span>
                      <span className="text-[#bebebe]">{formatDate(project.updated_at)}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleOpenProject(project.id)}
                      disabled={openingId === project.id}
                      className="px-5 py-2 rounded-lg bg-[#414141] text-white text-sm font-medium hover:bg-[#585858] disabled:opacity-50 transition-colors"
                    >
                      {openingId === project.id ? 'Loading...' : 'Open'}
                    </button>

                    {confirmDeleteId === project.id ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleDelete(project.id)}
                          disabled={deletingId === project.id}
                          className="px-3 py-2 rounded-lg text-sm font-medium text-white bg-[#9e5858] hover:bg-red-700 disabled:opacity-50 transition-colors"
                        >
                          {deletingId === project.id ? '...' : 'Confirm'}
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
                        onClick={() => setConfirmDeleteId(project.id)}
                        className="px-3 py-2 rounded-lg text-sm text-[#8c8c8c] hover:text-[#9e5858] hover:bg-red-50 transition-colors"
                        title="Delete project"
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

      <NewProjectDialog
        open={showNewDialog}
        onClose={() => setShowNewDialog(false)}
        onCreated={handleProjectCreated}
      />
    </div>
  )
}
