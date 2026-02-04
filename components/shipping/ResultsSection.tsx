'use client'

import type { PortResult } from '@/lib/types'
import { sectionHeading } from '@/lib/constants'
import ComparisonSummary from './ComparisonSummary'
import ComparisonTable from './ComparisonTable'
import ComparisonCharts from './ComparisonCharts'
import TerminalBreakdown from './TerminalBreakdown'

type Props = {
  result: PortResult
  onExportExcel: () => void
}

export default function ResultsSection({ result, onExportExcel }: Props) {
  return (
    <section className="space-y-8">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <h2 className={sectionHeading}>
          Results — {result.port.name || 'Unnamed Port'}
        </h2>
        <button
          type="button"
          onClick={onExportExcel}
          className="px-4 py-2 rounded-lg bg-[#3c5e86] text-white text-xs font-semibold hover:bg-[#2a4566] transition-colors"
        >
          Download Excel Report
        </button>
      </div>

      {/* Delta summary cards */}
      <ComparisonSummary totals={result.totals} />

      {/* Baseline vs scenario table */}
      <ComparisonTable totals={result.totals} />

      {/* Charts */}
      <ComparisonCharts totals={result.totals} />

      {/* Per-terminal drill-down */}
      {result.terminals.length > 1 && (
        <TerminalBreakdown terminals={result.terminals} />
      )}

      {/* Single terminal still shows detail */}
      {result.terminals.length === 1 && (
        <TerminalBreakdown terminals={result.terminals} />
      )}
    </section>
  )
}
