'use client'

import { useState } from 'react'
import type { TerminalConfig } from '@/lib/types'
import { inputBase } from '@/lib/constants'
import OnshoreTab from './OnshoreTab'
import OffshoreTab from './OffshoreTab'

type Props = {
  terminal: TerminalConfig
  onChange: (updated: TerminalConfig) => void
  onRemove: () => void
  canRemove: boolean
  /** Start collapsed (useful when there are many terminals) */
  defaultCollapsed?: boolean
}

type TabKey = 'onshore' | 'offshore'

export default function TerminalCard({
  terminal,
  onChange,
  onRemove,
  canRemove,
  defaultCollapsed = false,
}: Props) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed)
  const [activeTab, setActiveTab] = useState<TabKey>('onshore')

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'onshore', label: 'Onshore (Land Equipment & Shore Power)' },
    { key: 'offshore', label: 'Offshore (Vessels & Tugs)' },
  ]

  // Quick summary for collapsed state
  const baselineCount = Object.values(terminal.onshore.baseline_equipment).reduce((s, v) => s + v, 0)
  const scenarioCount = Object.values(terminal.onshore.scenario_equipment).reduce((s, v) => s + v, 0)
  const vesselCount = terminal.offshore.vessel_calls.reduce((s, vc) => s + vc.annual_calls, 0)

  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
      {/* Header — always visible, click to expand/collapse */}
      <div
        className="flex items-center gap-3 px-6 py-4 bg-[#fafafa] border-b border-gray-100 cursor-pointer"
        onClick={() => setCollapsed(!collapsed)}
      >
        {/* Collapse toggle */}
        <span className="text-[11px] text-[#8c8c8c] w-4 shrink-0">
          {collapsed ? '\u25B6' : '\u25BC'}
        </span>

        {/* Terminal name (editable, stop propagation so clicking input doesn't collapse) */}
        <input
          type="text"
          value={terminal.name}
          onChange={(e) => onChange({ ...terminal, name: e.target.value })}
          onClick={(e) => e.stopPropagation()}
          className={`${inputBase} max-w-xs font-semibold`}
          placeholder="Terminal name"
        />

        {/* Quick stats when collapsed */}
        {collapsed && (
          <div className="flex items-center gap-4 text-[10px] text-[#8c8c8c]">
            {terminal.onshore.annual_teu > 0 && (
              <span>{(terminal.onshore.annual_teu / 1000).toFixed(0)}K TEU</span>
            )}
            {baselineCount > 0 && (
              <span>{baselineCount} baseline units</span>
            )}
            {scenarioCount > 0 && (
              <span>{scenarioCount} electrified units</span>
            )}
            {vesselCount > 0 && (
              <span>{vesselCount.toLocaleString()} vessel calls</span>
            )}
          </div>
        )}

        <div className="flex-1" />

        {canRemove && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onRemove()
            }}
            className="text-xs text-[#9e5858] hover:text-red-700 font-medium transition-colors"
          >
            Remove
          </button>
        )}
      </div>

      {/* Collapsible content */}
      {!collapsed && (
        <>
          {/* Tab bar */}
          <div className="flex border-b border-gray-100">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 text-center py-3 text-xs font-semibold uppercase tracking-wide transition-colors
                  ${
                    activeTab === tab.key
                      ? 'text-[#3c5e86] border-b-2 border-[#3c5e86] bg-white'
                      : 'text-[#8c8c8c] hover:text-[#585858] bg-[#fafafa]'
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="p-6">
            {activeTab === 'onshore' && (
              <OnshoreTab
                onshore={terminal.onshore}
                onChange={(on) => onChange({ ...terminal, onshore: on })}
              />
            )}
            {activeTab === 'offshore' && (
              <OffshoreTab
                offshore={terminal.offshore}
                onChange={(off) => onChange({ ...terminal, offshore: off })}
              />
            )}
          </div>
        </>
      )}
    </div>
  )
}
