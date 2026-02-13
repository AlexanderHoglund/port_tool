'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { PieceProvider } from './context/PieceContext'

const NAV_ITEMS = [
  { href: '/piece', label: 'Projects', exact: true },
  { href: '/piece/calculator', label: 'Calculator', exact: false },
  { href: '/piece/assumptions', label: 'Project Assumptions', exact: false },
]

export default function PieceLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  const isActive = (item: typeof NAV_ITEMS[number]) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href)

  return (
    <PieceProvider>
      {/* Outer frame — light gray container that signals "you're inside the tool" */}
      <div className="mx-3 sm:mx-5 lg:mx-8 my-4 bg-[#f5f6f7] rounded-2xl border border-gray-200 min-h-[calc(100vh-140px)]">
        {/* Internal PiECE nav */}
        <div className="bg-white border-b border-gray-200 rounded-t-2xl">
          <div className="max-w-7xl mx-auto px-6 flex items-center h-12 gap-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#8c8c8c] mr-4">
              PiECE Tool
            </span>
            {NAV_ITEMS.map((item) => {
              const active = isActive(item)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    active
                      ? 'text-[#3c5e86] font-medium bg-[#eef5fc]'
                      : 'text-[#8c8c8c] hover:text-[#414141] hover:bg-gray-100'
                  }`}
                >
                  {item.label}
                </Link>
              )
            })}
          </div>
        </div>

        {/* Tool content */}
        <div>
          {children}
        </div>
      </div>
    </PieceProvider>
  )
}
