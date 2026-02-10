export default function AboutPage() {
  return (
    <div className="py-10">
      <div className="max-w-3xl mx-auto px-6 lg:px-8">
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="px-8 py-8 border-b border-gray-100">
            <h1 className="text-2xl font-semibold text-[#414141] mb-2">
              PIECE Tool
            </h1>
            <p className="text-base text-[#5a5a5a]">
              Port Infrastructure for Electric &amp; Clean Energy
            </p>
          </div>

          {/* Content */}
          <div className="px-8 py-8 space-y-6">
            <section>
              <h2 className="text-sm font-bold uppercase tracking-widest text-[#8c8c8c] mb-3">
                Overview
              </h2>
              <p className="text-sm text-[#414141] leading-relaxed">
                The PIECE tool evaluates the capital investment, operating costs, energy demand,
                and CO2 savings of electrifying port terminal operations. It uses a throughput-based
                calculation model with equipment-level granularity, berth-by-berth shore power
                analysis, charger infrastructure sizing, and grid modeling.
              </p>
            </section>

            <section>
              <h2 className="text-sm font-bold uppercase tracking-widest text-[#8c8c8c] mb-3">
                What it calculates
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  ['Equipment Emissions', 'Energy consumption and CO2 from cranes, tractors, reach stackers, and other terminal equipment'],
                  ['Shore Power (OPS)', 'Onshore power supply analysis per berth, including CAPEX for transformers, converters, and civil works'],
                  ['Charger Infrastructure', 'EVSE sizing for battery-powered mobile equipment based on fleet composition'],
                  ['Grid Infrastructure', 'Substation ratings, cable sizing, and grid connection costs from equipment to central distribution'],
                  ['Financial Analysis', 'Total CAPEX, annual OPEX comparison, diesel savings, and simple payback period'],
                  ['CO2 Reduction', 'Baseline vs scenario emissions with well-to-wheel emission factors'],
                ].map(([title, desc]) => (
                  <div key={title} className="p-4 rounded-lg bg-gray-50">
                    <div className="text-sm font-semibold text-[#414141] mb-1">{title}</div>
                    <div className="text-xs text-[#8c8c8c] leading-relaxed">{desc}</div>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2 className="text-sm font-bold uppercase tracking-widest text-[#8c8c8c] mb-3">
                Data Sources
              </h2>
              <p className="text-sm text-[#414141] leading-relaxed">
                Default assumptions are derived from industry benchmarks and can be customized
                on the <a href="/piece/assumptions" className="text-[#414141] font-medium underline underline-offset-2 hover:text-[#3c5e86]">Assumptions</a> page.
                Equipment specifications, emission factors, and cost parameters are stored in
                the database and can be overridden per analysis without modifying the defaults.
              </p>
            </section>

            <section>
              <h2 className="text-sm font-bold uppercase tracking-widest text-[#8c8c8c] mb-3">
                Terminal Types
              </h2>
              <div className="flex gap-3">
                {['Container', 'Cruise', 'RoRo'].map((type) => (
                  <span key={type} className="px-4 py-2 rounded-lg bg-[#414141] text-white text-xs font-medium">
                    {type}
                  </span>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}
