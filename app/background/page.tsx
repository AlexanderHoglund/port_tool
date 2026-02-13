import Link from 'next/link'

export default function BackgroundPage() {
  return (
    <div className="pb-20">
      {/* Page title */}
      <div className="max-w-[1400px] mx-auto px-5 lg:px-8 pt-10">
        <h1 className="text-[30px] sm:text-[48px] font-extralight text-[#2c3e50] leading-[1.15] tracking-[-0.02em] mb-4 max-w-3xl">
          Why Decarbonise Ports?
        </h1>
        <p className="text-[15px] text-[#6b7280] max-w-2xl leading-relaxed mb-10">
          Maritime transport and port operations are under increasing regulatory, financial,
          and public health pressure to transition away from fossil fuels.
        </p>
      </div>

      {/* FuelEU Maritime */}
      <div className="max-w-[1400px] mx-auto px-5 lg:px-8">
        <div className="border-t border-gray-300" />
        <div className="pt-8 pb-12 flex flex-col lg:flex-row gap-8 lg:gap-16">
          <div className="lg:w-1/3 shrink-0">
            <h2 className="text-[22px] font-light text-[#2c3e50] leading-snug">
              FuelEU Maritime Regulation
            </h2>
          </div>
          <div className="lg:w-2/3 space-y-5 text-[15px] text-[#4b5563] leading-[1.75]">
            <p>
              The <strong className="text-[#2c3e50] font-medium">FuelEU Maritime regulation</strong> (Regulation
              (EU) 2025/1415) entered into force on 1 January 2025 and sets binding greenhouse gas intensity
              targets for the energy used by ships calling at EU and EEA ports.
            </p>
            <p>
              Ships must reduce their well-to-wake GHG intensity by <strong className="text-[#2c3e50] font-medium">2%
              in 2025</strong>, ramping to <strong className="text-[#2c3e50] font-medium">80% by 2050</strong> compared
              to a 2020 reference value of 91.16 gCO&#x2082;eq/MJ. From 2030, container and passenger vessels
              at berth for more than two hours must connect to onshore power supply (OPS) or use an equivalent
              zero-emission technology.
            </p>
            <p>
              Non-compliance triggers financial penalties calculated per voyage and per MJ of energy deficit,
              making port-side electrification infrastructure a commercial necessity rather than a policy aspiration.
            </p>
            <div className="bg-[#d4eefa]/40 border-l-[3px] border-[#3c5e86] px-5 py-4 rounded-r-lg">
              <p className="text-[13px] text-[#3c5e86] leading-relaxed">
                <strong className="font-medium">Key dates:</strong> 2025 &mdash; GHG intensity limits
                begin &bull; 2030 &mdash; OPS mandate for container &amp; passenger ships &bull;
                2035 &mdash; 14.5% reduction &bull; 2050 &mdash; 80% reduction
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Science Based Targets */}
      <div className="max-w-[1400px] mx-auto px-5 lg:px-8">
        <div className="border-t border-gray-300" />
        <div className="pt-8 pb-12 flex flex-col lg:flex-row gap-8 lg:gap-16">
          <div className="lg:w-1/3 shrink-0">
            <h2 className="text-[22px] font-light text-[#2c3e50] leading-snug">
              Science Based Targets (SBTi)
            </h2>
          </div>
          <div className="lg:w-2/3 space-y-5 text-[15px] text-[#4b5563] leading-[1.75]">
            <p>
              The <strong className="text-[#2c3e50] font-medium">Science Based Targets initiative
              (SBTi)</strong> provides a framework for companies to set emissions reduction targets
              consistent with limiting global warming to 1.5&#x00B0;C. Several major port authorities
              and terminal operators have committed to validated SBTi targets.
            </p>
            <p>
              For ports, this typically means addressing all three emission scopes:
            </p>
            <div className="space-y-3 pl-1">
              <div className="flex gap-4">
                <span className="text-[13px] font-medium text-[#2c3e50] shrink-0 w-16">Scope 1</span>
                <span className="text-[14px] text-[#4b5563]">Direct emissions from port-owned vehicles, equipment, and heating</span>
              </div>
              <div className="flex gap-4">
                <span className="text-[13px] font-medium text-[#2c3e50] shrink-0 w-16">Scope 2</span>
                <span className="text-[14px] text-[#4b5563]">Indirect emissions from purchased electricity for terminal operations, lighting, and buildings</span>
              </div>
              <div className="flex gap-4">
                <span className="text-[13px] font-medium text-[#2c3e50] shrink-0 w-16">Scope 3</span>
                <span className="text-[14px] text-[#4b5563]">Value-chain emissions including vessels at berth, tenant operations, and cargo transport</span>
              </div>
            </div>
            <p>
              Electrifying terminal equipment and providing shore power directly reduces Scope 1 and
              Scope 3 emissions, while grid decarbonisation addresses Scope 2. The PiECE Tool quantifies
              these reductions on a per-terminal, per-equipment basis.
            </p>
          </div>
        </div>
      </div>

      {/* Health Impacts */}
      <div className="max-w-[1400px] mx-auto px-5 lg:px-8">
        <div className="border-t border-gray-300" />
        <div className="pt-8 pb-12 flex flex-col lg:flex-row gap-8 lg:gap-16">
          <div className="lg:w-1/3 shrink-0">
            <h2 className="text-[22px] font-light text-[#2c3e50] leading-snug">
              Health Impacts of Port Pollution
            </h2>
          </div>
          <div className="lg:w-2/3 space-y-5 text-[15px] text-[#4b5563] leading-[1.75]">
            <p>
              Ports are significant sources of air pollution. Diesel-powered cargo handling equipment,
              auxiliary engines on berthed vessels, and heavy-duty truck traffic
              produce <strong className="text-[#2c3e50] font-medium">nitrogen oxides
              (NO&#x2093;), sulphur dioxide (SO&#x2082;), particulate matter
              (PM&#x2082;.&#x2085;)</strong>, and volatile organic compounds that degrade local air quality.
            </p>
            <p>
              Communities located near ports &mdash; often lower-income and historically underserved
              populations &mdash; bear a disproportionate burden. Epidemiological studies consistently
              associate proximity to port activity with elevated rates of:
            </p>
            <ul className="space-y-2 pl-1">
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-[#9ca3af] mt-2 shrink-0" />
                <span>Respiratory diseases including asthma and chronic obstructive pulmonary disease</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-[#9ca3af] mt-2 shrink-0" />
                <span>Cardiovascular events such as heart attacks and strokes</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-[#9ca3af] mt-2 shrink-0" />
                <span>Premature mortality attributable to long-term PM&#x2082;.&#x2085; exposure</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-[#9ca3af] mt-2 shrink-0" />
                <span>Adverse birth outcomes including low birth weight and preterm delivery</span>
              </li>
            </ul>
            <p>
              The International Maritime Organization (IMO) and the World Health Organization (WHO)
              have both identified port-related emissions as a significant contributor to urban air
              pollution. Transitioning to electric equipment and shore power eliminates tailpipe
              emissions at the point of use, directly improving air quality in surrounding neighbourhoods.
            </p>
          </div>
        </div>
      </div>

      {/* The Case for Electrification */}
      <div className="max-w-[1400px] mx-auto px-5 lg:px-8">
        <div className="border-t border-gray-300" />
        <div className="pt-8 pb-12 flex flex-col lg:flex-row gap-8 lg:gap-16">
          <div className="lg:w-1/3 shrink-0">
            <h2 className="text-[22px] font-light text-[#2c3e50] leading-snug">
              The Case for Port Electrification
            </h2>
          </div>
          <div className="lg:w-2/3 space-y-5 text-[15px] text-[#4b5563] leading-[1.75]">
            <p>
              Electric alternatives now exist for virtually every category of port terminal
              equipment &mdash; from ship-to-shore cranes (already predominantly electric) to yard
              tractors, reach stackers, and straddle carriers where battery-electric models are
              entering commercial service.
            </p>
            <p>
              Key drivers making electrification economically viable:
            </p>
            <div className="space-y-4 pl-1">
              <div>
                <span className="text-[14px] font-medium text-[#2c3e50]">Falling battery costs</span>
                <p className="text-[14px] text-[#4b5563] mt-0.5">
                  Lithium-ion battery pack prices have declined over 90% since 2010 and continue to fall.
                </p>
              </div>
              <div>
                <span className="text-[14px] font-medium text-[#2c3e50]">Lower operating costs</span>
                <p className="text-[14px] text-[#4b5563] mt-0.5">
                  Electricity is cheaper per kWh of useful work than diesel, with fewer moving parts requiring maintenance.
                </p>
              </div>
              <div>
                <span className="text-[14px] font-medium text-[#2c3e50]">Carbon pricing</span>
                <p className="text-[14px] text-[#4b5563] mt-0.5">
                  The EU Emissions Trading System (ETS) and national carbon taxes are increasing the cost of fossil fuel use.
                </p>
              </div>
              <div>
                <span className="text-[14px] font-medium text-[#2c3e50]">OPS mandates</span>
                <p className="text-[14px] text-[#4b5563] mt-0.5">
                  FuelEU Maritime requires shore power infrastructure regardless, creating a grid connection that can serve terminal equipment.
                </p>
              </div>
            </div>
            <p>
              The PiECE Tool helps port authorities and terminal operators evaluate the full cost
              and benefit of this transition &mdash; from individual equipment conversion to port-wide
              grid infrastructure sizing.
            </p>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="max-w-[1400px] mx-auto px-5 lg:px-8">
        <div className="border-t border-gray-300" />
        <div className="pt-10 flex flex-col lg:flex-row gap-8 lg:gap-16">
          <div className="lg:w-1/3 shrink-0">
            <p className="text-[13px] text-[#9ca3af] leading-relaxed">
              Port Hub Tool &mdash; Port Infrastructure for Electric &amp; Clean Energy
            </p>
          </div>
          <div className="lg:w-2/3">
            <Link
              href="/piece"
              className="inline-flex items-center gap-2 text-[15px] font-medium text-[#2c3e50] hover:text-[#3c5e86] transition-colors group"
            >
              Open the PiECE Tool
              <span className="text-lg transition-transform group-hover:translate-x-1">&rarr;</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
