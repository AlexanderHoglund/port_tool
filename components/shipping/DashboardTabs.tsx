'use client'

import Image from 'next/image'

export type DashboardTab = 'baseline' | 'scenario' | 'results' | 'compare'

type Props = {
  activeTab: DashboardTab
  onTabChange: (tab: DashboardTab) => void
  isBaselineComplete: boolean
  isScenarioComplete: boolean
  hasResult: boolean
  isCompareReady?: boolean
}

const TABS: { key: DashboardTab; label: string; color: string; activeBg: string; checkBg: string; icon: string }[] = [
  { key: 'baseline', label: 'Baseline', color: '#3c5e86', activeBg: 'bg-[#d4eefa]', checkBg: 'bg-[#3c5e86]', icon: '/Icons/Icons/Shipping/Wharf.svg' },
  { key: 'scenario', label: 'Scenario', color: '#286464', activeBg: 'bg-[#dcf0d6]', checkBg: 'bg-[#286464]', icon: '/Icons/Icons/Energy & Fuels/Electric power.svg' },
  { key: 'results', label: 'Results', color: '#bc8e54', activeBg: 'bg-[#fceec8]', checkBg: 'bg-[#bc8e54]', icon: '/Icons/Icons/Efficiency/Bar chart growth.svg' },
  { key: 'compare', label: 'Compare', color: '#7c5e8a', activeBg: 'bg-[#ede4f2]', checkBg: 'bg-[#7c5e8a]', icon: '/Icons/Icons/Efficiency/Arrow two directions.svg' },
]

const STEP_NUMBERS: Record<DashboardTab, string> = {
  baseline: '1',
  scenario: '2',
  results: '3',
  compare: '4',
}

export default function DashboardTabs({
  activeTab,
  onTabChange,
  isBaselineComplete,
  isScenarioComplete,
  hasResult,
  isCompareReady,
}: Props) {
  const isComplete = (key: DashboardTab) => {
    if (key === 'baseline') return isBaselineComplete
    if (key === 'scenario') return isScenarioComplete
    if (key === 'results') return hasResult
    if (key === 'compare') return isCompareReady ?? false
    return false
  }

  return (
    <div className="sticky top-20 z-10 bg-[#f5f4f2] border-b border-[#dcdcdc]">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex gap-1">
          {TABS.map((tab) => {
            const active = activeTab === tab.key
            const complete = isComplete(tab.key)

            return (
              <button
                key={tab.key}
                onClick={() => onTabChange(tab.key)}
                className={`relative flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors rounded-t-lg ${
                  active
                    ? `${tab.activeBg} text-[${tab.color}] border-b-2`
                    : 'text-[#8c8c8c] hover:text-[#585858] hover:bg-white/40'
                }`}
                style={active ? { borderBottomColor: tab.color } : undefined}
              >
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    complete
                      ? `${tab.checkBg} text-white`
                      : active
                        ? `border-2 text-[${tab.color}]`
                        : 'border-2 border-[#bebebe] text-[#bebebe]'
                  }`}
                  style={active && !complete ? { borderColor: tab.color, color: tab.color } : undefined}
                >
                  {complete ? '\u2713' : STEP_NUMBERS[tab.key]}
                </span>
                <Image
                  src={tab.icon}
                  alt=""
                  width={16}
                  height={16}
                  className={active ? 'opacity-50' : 'opacity-30'}
                />
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
