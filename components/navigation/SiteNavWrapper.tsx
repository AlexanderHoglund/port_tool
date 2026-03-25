'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_LINKS = [
  { href: '/background', label: 'Background' },
  { href: '/general-assumptions', label: 'Useful Data' },
  { href: '/piece', label: 'PIECE Tool' },
  { href: '/tutorial', label: 'Tutorial' },
]

const DIAMOND_BUTTONS = [
  { href: '/', label: 'Homepage', color: '#6b7280' },
  { href: '/background', label: 'Background', color: '#3c5e86' },
  { href: '/general-assumptions', label: 'Useful Data', color: '#bc8e54' },
  { href: '/piece', label: 'PIECE Tool', color: '#286464' },
  { href: '/tutorial', label: 'Tutorial', color: '#8b6baa' },
]

/** Lighten a hex color by mixing with white. Amount 0-1. */
function lightenColor(hex: string, amount: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const lr = Math.round(r + (255 - r) * amount)
  const lg = Math.round(g + (255 - g) * amount)
  const lb = Math.round(b + (255 - b) * amount)
  return `#${lr.toString(16).padStart(2, '0')}${lg.toString(16).padStart(2, '0')}${lb.toString(16).padStart(2, '0')}`
}

export default function SiteNavWrapper() {
  const pathname = usePathname()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href)

  return (
    <header className="sticky top-0 z-50 px-4 pt-4">
      {/* Floating rounded navbar */}
      <nav
        className={`max-w-[1400px] mx-auto rounded-2xl transition-all duration-300 ${
          scrolled
            ? 'bg-[#414141] shadow-lg'
            : 'bg-white'
        }`}
      >
        <div className="px-6 lg:px-8 flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 shrink-0">
            <Image
              src="/200w.gif"
              alt="PIECE Tool"
              width={200}
              height={66}
              className={`h-9 w-auto transition-all duration-300 ${
                scrolled ? 'brightness-200 invert' : ''
              }`}
              priority
            />
            <div className="hidden sm:block leading-none">
              <div
                className={`text-[13px] font-medium tracking-[-0.01em] transition-colors duration-300 ${
                  scrolled ? 'text-white' : 'text-[#2c3e50]'
                }`}
              >
                PIECE Tool
              </div>
              <div
                className={`text-[10px] mt-0.5 transition-colors duration-300 ${
                  scrolled ? 'text-white/50' : 'text-[#9ca3af]'
                }`}
              >
                Port Infrastructure for Electric &amp; Clean Energy
              </div>
            </div>
          </Link>

          {/* Diamond button nav — colored rhombus indicators */}
          <div className="hidden md:flex items-center gap-1 divide-x divide-gray-200/50 rounded-xl overflow-hidden">
            {DIAMOND_BUTTONS.map((item) => {
              const active = isActive(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group flex items-center gap-2 px-3.5 py-2 transition-colors ${
                    active
                      ? scrolled ? 'bg-white/10' : 'bg-gray-50'
                      : scrolled ? 'hover:bg-white/5' : 'hover:bg-gray-50/60'
                  }`}
                >
                  <span
                    className={`w-2.5 h-2.5 rotate-45 rounded-[2px] shrink-0 transition-transform group-hover:scale-110 ${
                      active ? 'scale-110' : ''
                    }`}
                    style={{
                      backgroundColor: scrolled
                        ? active ? lightenColor(item.color, 0.7) : lightenColor(item.color, 0.5)
                        : active ? item.color : `${item.color}40`,
                      border: `1.5px solid ${scrolled
                        ? lightenColor(item.color, 0.7)
                        : item.color}`,
                    }}
                  />
                  <span
                    className={`text-[11px] uppercase tracking-[0.08em] font-medium whitespace-nowrap transition-colors duration-300 ${
                      scrolled
                        ? active ? 'text-white' : 'text-white/80 group-hover:text-white'
                        : active ? 'text-[#2c3e50]' : 'text-[#9ca3af] group-hover:text-[#6b7280]'
                    }`}
                  >
                    {item.label}
                  </span>
                </Link>
              )
            })}
          </div>
        </div>
      </nav>
    </header>
  )
}
