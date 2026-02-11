'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { PieceProvider } from './context/PieceContext'

const NAV_ITEMS = [
  { href: '/piece', label: 'Dashboard', exact: true },
  { href: '/piece/assumptions', label: 'Assumptions', exact: false },
  { href: '/piece/projects', label: 'Projects', exact: false },
  { href: '/piece/about', label: 'About', exact: false },
]

export default function PieceLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  const isActive = (item: typeof NAV_ITEMS[number]) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href)

  return (
    <PieceProvider>
    <div className="min-h-screen bg-[#f2f2f2]">
      {/* Floating navbar container */}
      <div className="sticky top-0 z-50 px-4 pt-4 pb-2">
        <nav className="max-w-7xl mx-auto bg-[#414141] rounded-2xl px-6 shadow-lg">
          <div className="flex items-center justify-between h-20">
            {/* Left: Logo + Tool Name */}
            <Link href="/piece" className="flex items-center gap-3.5 shrink-0">
              <Image
                src="/200w.gif"
                alt="Port Hub Tool"
                width={200}
                height={66}
                className="h-12 w-auto brightness-200 invert"
                priority
              />
              <div className="hidden sm:block">
                <div className="text-white text-[13px] font-semibold leading-tight tracking-tight">
                  PIECE Tool
                </div>
                <div className="text-[#bebebe] text-[10px] leading-tight">
                  Port Infrastructure for Electric &amp; Clean Energy
                </div>
              </div>
            </Link>

            {/* Right: Navigation Links */}
            <div className="flex items-center gap-0.5">
              {NAV_ITEMS.map((item) => {
                const active = isActive(item)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-4 py-1.5 text-sm transition-colors rounded-lg ${
                      active
                        ? 'text-white font-medium'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {item.label}
                  </Link>
                )
              })}
            </div>
          </div>
        </nav>
      </div>

      {/* Page Content */}
      {children}
    </div>
    </PieceProvider>
  )
}
