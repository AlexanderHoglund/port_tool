'use client'

import { useState } from 'react'
import type { PortConfig, ProjectRow } from '@/lib/types'
import { PORT_SIZES, inputBase, labelBase } from '@/lib/constants'
import { createProject, loadProject as loadProjectRow } from '@/lib/piece-projects'

type Props = {
  open: boolean
  onClose: () => void
  onCreated: (projectRow: ProjectRow) => void
}

export default function NewProjectDialog({ open, onClose, onCreated }: Props) {
  const [projectName, setProjectName] = useState('')
  const [portName, setPortName] = useState('')
  const [portLocation, setPortLocation] = useState('')
  const [portSizeKey, setPortSizeKey] = useState<PortConfig['size_key']>('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  const handleSubmit = async () => {
    if (!projectName.trim()) return
    setSaving(true)
    setError(null)

    try {
      const port: PortConfig = {
        name: portName.trim(),
        location: portLocation.trim(),
        size_key: portSizeKey,
      }

      const baseline = {
        terminals: [{
          id: crypto.randomUUID(),
          name: 'Terminal 1',
          terminal_type: 'container' as const,
          berths: [],
          baseline_equipment: {},
          annual_teu: 0,
          vessel_calls: [],
        }],
      }

      const projectId = await createProject({
        project_name: projectName.trim(),
        description: description.trim() || undefined,
        port,
        baseline,
      })

      const projectRow = await loadProjectRow(projectId)
      onCreated(projectRow)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      {/* Dialog */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
        <h2 className="text-lg font-semibold text-[#414141] mb-1">New Project</h2>
        <p className="text-xs text-[#8c8c8c] mb-5">
          Create a port project to define your baseline and electrification scenarios.
        </p>

        <div className="space-y-4">
          <div>
            <label className={labelBase}>Project Name *</label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className={inputBase}
              placeholder="e.g. Rotterdam Hub Electrification"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelBase}>Port Name</label>
              <input
                type="text"
                value={portName}
                onChange={(e) => setPortName(e.target.value)}
                className={inputBase}
                placeholder="e.g. Port of Rotterdam"
              />
            </div>
            <div>
              <label className={labelBase}>Location</label>
              <input
                type="text"
                value={portLocation}
                onChange={(e) => setPortLocation(e.target.value)}
                className={inputBase}
                placeholder="e.g. Netherlands"
              />
            </div>
          </div>

          <div>
            <label className={labelBase}>Port Size</label>
            <select
              value={portSizeKey}
              onChange={(e) => setPortSizeKey(e.target.value as PortConfig['size_key'])}
              className={inputBase}
            >
              {PORT_SIZES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelBase}>Description (optional)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={inputBase}
              placeholder="Notes about this project..."
            />
          </div>

          {error && (
            <p className="text-xs text-[#bf360c]">{error}</p>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-[#8c8c8c] hover:text-[#414141] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !projectName.trim()}
            className="px-6 py-2 rounded-lg bg-[#3c5e86] text-white text-sm font-medium hover:bg-[#2a4566] transition-colors disabled:opacity-40"
          >
            {saving ? 'Creating...' : 'Create Project'}
          </button>
        </div>
      </div>
    </div>
  )
}
