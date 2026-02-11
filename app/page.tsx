import Link from 'next/link'
import Image from 'next/image'

export default function Home() {
  return (
    <div className="min-h-screen bg-[#f2f2f2]">
      {/* Navbar — matches PIECE tool style */}
      <div className="px-4 pt-4 pb-2">
        <nav className="max-w-7xl mx-auto bg-[#414141] rounded-2xl px-6 shadow-lg">
          <div className="flex items-center justify-between h-20">
            <Link href="/" className="flex items-center gap-3.5 shrink-0">
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
                  Port Hub Tool
                </div>
                <div className="text-[#bebebe] text-[10px] leading-tight">
                  Port Energy Transition Planning
                </div>
              </div>
            </Link>
            <Link
              href="/piece"
              className="px-5 py-2 rounded-lg text-sm font-medium text-white bg-[#3c5e86] hover:bg-[#2a4566] transition-colors"
            >
              Open PIECE Tool
            </Link>
          </div>
        </nav>
      </div>

      {/* Hero */}
      <div className="max-w-7xl mx-auto px-6 lg:px-8 pt-16 pb-12">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-[#414141] tracking-tight mb-4">
            Port Infrastructure for<br />
            Electric &amp; Clean Energy
          </h1>
          <p className="text-lg text-[#585858] mb-3">
            Evaluate the capital investment, operating costs, and CO&#x2082; savings
            of electrifying port terminal operations.
          </p>
          <p className="text-sm text-[#8c8c8c] max-w-xl mx-auto mb-10">
            The PIECE tool uses throughput-based modelling with equipment-level granularity,
            berth-by-berth shore power analysis, charger infrastructure sizing, and grid modelling.
          </p>
          <Link
            href="/piece"
            className="inline-block bg-[#414141] hover:bg-[#585858] text-white font-semibold text-base py-3.5 px-10 rounded-xl transition-colors"
          >
            Get Started
          </Link>
        </div>
      </div>

      {/* Feature cards */}
      <div className="max-w-7xl mx-auto px-6 lg:px-8 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            {
              title: 'Equipment Electrification',
              desc: 'Model diesel-to-electric conversion of cranes, tractors, reach stackers, and other terminal equipment with per-unit CAPEX and OPEX.',
              color: '#e8f8fc',
              border: '#d4eefa',
              accent: '#3c5e86',
            },
            {
              title: 'Shore Power & OPS',
              desc: 'Berth-by-berth onshore power supply analysis including transformers, frequency converters, cable runs, and civil works.',
              color: '#eefae8',
              border: '#dcf0d6',
              accent: '#286464',
            },
            {
              title: 'Financial Analysis',
              desc: 'Total CAPEX breakdown, annual OPEX comparison, diesel savings, grid infrastructure costs, and simple payback period.',
              color: '#fcf8e4',
              border: '#fceec8',
              accent: '#bc8e54',
            },
          ].map((card) => (
            <div
              key={card.title}
              className="rounded-2xl p-6 border"
              style={{ backgroundColor: card.color, borderColor: card.border }}
            >
              <div
                className="w-2 h-2 rounded-full mb-4"
                style={{ backgroundColor: card.accent }}
              />
              <h3 className="text-base font-semibold text-[#414141] mb-2">{card.title}</h3>
              <p className="text-sm text-[#585858] leading-relaxed">{card.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Supported terminal types */}
      <div className="max-w-7xl mx-auto px-6 lg:px-8 pb-16">
        <div className="bg-white rounded-2xl border border-gray-200 px-8 py-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-widest text-[#8c8c8c] mb-1">
                Supported Terminal Types
              </h2>
              <p className="text-sm text-[#585858]">
                Multi-terminal port modelling with independent equipment and berth configurations
              </p>
            </div>
            <div className="flex gap-2">
              {['Container', 'Cruise', 'RoRo'].map((type) => (
                <span
                  key={type}
                  className="px-4 py-2 rounded-lg bg-[#414141] text-white text-xs font-medium"
                >
                  {type}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-[#dcdcdc]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-6 flex items-center justify-between">
          <p className="text-xs text-[#8c8c8c]">PIECE Tool &mdash; Port Infrastructure for Electric &amp; Clean Energy</p>
          <Link href="/piece/about" className="text-xs text-[#8c8c8c] hover:text-[#414141] transition-colors">
            About
          </Link>
        </div>
      </div>
    </div>
  )
}
