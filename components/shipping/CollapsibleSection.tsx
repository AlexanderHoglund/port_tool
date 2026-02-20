'use client'

import { useState } from 'react'

type Props = {
  title: string
  badge?: React.ReactNode
  defaultOpen?: boolean
  children: React.ReactNode
  /** 'alterable' = baseline has something to change (star), 'modified' = changes applied (green check) */
  status?: 'alterable' | 'modified'
}

export default function CollapsibleSection({
  title,
  badge,
  defaultOpen = false,
  children,
  status,
}: Props) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="border-t border-gray-200">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-6 py-3 bg-[#f5f5f5] hover:bg-[#eeeeee] transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-[#777] w-4">
            {open ? '\u25BC' : '\u25B6'}
          </span>
          <span className="text-[11px] font-bold uppercase tracking-widest text-[#555]">
            {title}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {badge && (
            <span className="text-[11px] text-[#777] font-medium">{badge}</span>
          )}
          {status === 'modified' && (
            <span className="w-5 h-5 rounded-full bg-[#286464] text-white flex items-center justify-center text-[10px] font-bold shrink-0" title="Changes applied">
              &#x2713;
            </span>
          )}
          {status === 'alterable' && (
            <span className="w-2 h-2 rounded-full bg-[#bc8e54] shrink-0" title="Customizable" />
          )}
        </div>
      </button>
      {open && (
        <div className="px-6 py-4">
          {children}
        </div>
      )}
    </div>
  )
}
