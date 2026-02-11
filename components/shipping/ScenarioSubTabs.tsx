'use client'

import { useState, useRef, useEffect } from 'react'
import type { ScenarioSummary } from '@/lib/types'

type Props = {
  scenarios: ScenarioSummary[]
  activeScenarioId: string | null
  onSelectScenario: (scenarioId: string) => void
  onCreateScenario?: () => void
  onRenameScenario?: (scenarioId: string, newName: string) => void
  disabled?: boolean
}

export default function ScenarioSubTabs({
  scenarios,
  activeScenarioId,
  onSelectScenario,
  onCreateScenario,
  onRenameScenario,
  disabled,
}: Props) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editingId])

  const startRename = (s: ScenarioSummary) => {
    setEditingId(s.id)
    setEditValue(s.scenario_name)
  }

  const commitRename = () => {
    if (editingId && editValue.trim() && onRenameScenario) {
      onRenameScenario(editingId, editValue.trim())
    }
    setEditingId(null)
  }

  return (
    <div className="flex items-center gap-1.5 mb-6 flex-wrap">
      {scenarios.map((s) => {
        const active = s.id === activeScenarioId

        if (editingId === s.id) {
          return (
            <input
              key={s.id}
              ref={inputRef}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitRename()
                if (e.key === 'Escape') setEditingId(null)
              }}
              className="px-3 py-1 rounded-full text-xs font-medium border-2 border-[#286464] outline-none bg-white text-[#414141] w-36"
            />
          )
        }

        return (
          <div key={s.id} className="group relative flex items-center">
            <button
              onClick={() => onSelectScenario(s.id)}
              onDoubleClick={() => onRenameScenario && startRename(s)}
              disabled={disabled || active}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
                active
                  ? 'bg-[#286464] text-white'
                  : 'bg-white text-[#585858] border border-[#dcdcdc] hover:border-[#286464] hover:text-[#286464]'
              } disabled:opacity-60`}
              title="Double-click to rename"
            >
              {s.scenario_name}
              {s.has_result && (
                <span className="ml-1.5 text-[10px] opacity-70">{'\u2713'}</span>
              )}
            </button>
            {onRenameScenario && (
              <button
                onClick={() => startRename(s)}
                className={`ml-0.5 w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-70 hover:opacity-100! transition-opacity text-[10px] ${
                  active
                    ? 'text-[#286464] hover:bg-[#286464]/10'
                    : 'text-[#8c8c8c] hover:bg-gray-100'
                }`}
                title="Rename scenario"
              >
                ✎
              </button>
            )}
          </div>
        )
      })}
      {onCreateScenario && (
        <button
          onClick={onCreateScenario}
          disabled={disabled}
          className="px-4 py-1.5 rounded-full text-xs font-medium border border-dashed border-[#bebebe] text-[#8c8c8c] hover:border-[#286464] hover:text-[#286464] transition-colors disabled:opacity-40"
        >
          + New
        </button>
      )}
    </div>
  )
}
