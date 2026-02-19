import Image from 'next/image'
import Link from 'next/link'

export default function LandingPage() {
  return (
    <div className="pb-16">
      {/* Hero image — MMMCZCS style: padded sides, rounded, constrained height */}
      <div className="max-w-[1400px] mx-auto px-5 lg:px-8 pt-8">
        <div className="relative w-full min-h-96 max-h-[560px] aspect-[3.2/1] rounded-2xl overflow-hidden">
          <Image
            src="/site/landing.jpg"
            alt="Aerial view of a container port terminal"
            fill
            className="object-cover"
            priority
          />
        </div>
      </div>

      {/* Title */}
      <div className="max-w-[1400px] mx-auto px-5 lg:px-8">
        <h1 className="text-[30px] sm:text-[48px] font-extralight text-[#2c3e50] leading-[1.15] tracking-[-0.02em] mt-12 mb-6 max-w-3xl">
          Port Electrification Planning Tool
        </h1>
      </div>

      {/* Divider + content — two-column like MMMCZCS */}
      <div className="max-w-[1400px] mx-auto px-5 lg:px-8">
        <div className="border-t border-gray-300" />
        <div className="pt-8 flex flex-col lg:flex-row gap-12">
          {/* Left column — empty on desktop (MMMCZCS pattern) */}
          <div className="hidden lg:block lg:w-1/3" />

          {/* Right column — body text */}
          <div className="lg:w-2/3 space-y-5 text-[15px] text-[#4b5563] leading-[1.75]">
            <p>
              Ports worldwide face mounting pressure to decarbonise their operations. New regulations
              such as FuelEU Maritime mandate onshore power supply for berthed vessels, while Science
              Based Targets and carbon pricing are driving terminal operators to replace diesel
              equipment with electric alternatives.
            </p>
            <p>
              The <strong className="text-[#2c3e50] font-medium">PiECE Tool</strong> (Port
              Infrastructure for Electric &amp; Clean Energy) enables port authorities and terminal
              operators to evaluate the capital investment, operating costs, and
              CO&#x2082; savings of electrifying port terminal operations — from individual
              equipment conversion to port-wide grid infrastructure sizing.
            </p>
          </div>
        </div>
      </div>

      {/* Explore section — card grid like MMMCZCS teasers */}
      <div className="max-w-[1400px] mx-auto px-5 lg:px-8 mt-20">
        <h2 className="text-[13px] font-medium uppercase tracking-[0.08em] text-[#9ca3af] mb-3">
          Features Available
        </h2>
        <p className="text-[15px] text-[#4b5563] leading-[1.75] mb-8 max-w-3xl">
          The PiECE Tool currently offers port-level electrification scenario modelling,
          including CAPEX and OPEX estimation for shore power, electric cranes, and yard
          equipment — alongside a regulatory background section covering FuelEU Maritime and
          Science Based Targets, reference data for equipment specs and grid parameters,
          and a step-by-step tutorial to guide you through the analysis.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <Link href="/piece" className="group">
            <div className="bg-[#e8f0f8] rounded-2xl aspect-[16/10] flex items-center justify-center mb-3 transition-all group-hover:shadow-md">
              <Image
                src="/Icons/Icons/Energy & Fuels/Electric power.svg"
                alt=""
                width={64}
                height={64}
                className="opacity-25 group-hover:opacity-40 transition-opacity"
              />
            </div>
            <h3 className="text-[15px] font-medium text-[#2c3e50] group-hover:text-[#3c5e86] transition-colors">
              PiECE Tool
            </h3>
            <p className="text-[13px] text-[#6b7280] mt-1 leading-relaxed">
              Evaluate electrification CAPEX, OPEX, and CO&#x2082; savings for your port
            </p>
          </Link>

          <Link href="/background" className="group">
            <div className="bg-[#e6f0ec] rounded-2xl aspect-[16/10] flex items-center justify-center mb-3 transition-all group-hover:shadow-md">
              <Image
                src="/Icons/Icons/Sustainability/Decarbonization.svg"
                alt=""
                width={64}
                height={64}
                className="opacity-25 group-hover:opacity-40 transition-opacity"
              />
            </div>
            <h3 className="text-[15px] font-medium text-[#2c3e50] group-hover:text-[#286464] transition-colors">
              Background &amp; Regulations
            </h3>
            <p className="text-[13px] text-[#6b7280] mt-1 leading-relaxed">
              FuelEU Maritime, SBTi, health impacts, and the case for electrification
            </p>
          </Link>

          <Link href="/general-assumptions" className="group">
            <div className="bg-[#f5f0e6] rounded-2xl aspect-[16/10] flex items-center justify-center mb-3 transition-all group-hover:shadow-md">
              <Image
                src="/Icons/Icons/Efficiency/Bar Chart.svg"
                alt=""
                width={64}
                height={64}
                className="opacity-25 group-hover:opacity-40 transition-opacity"
              />
            </div>
            <h3 className="text-[15px] font-medium text-[#2c3e50] group-hover:text-[#bc8e54] transition-colors">
              Useful Data
            </h3>
            <p className="text-[13px] text-[#6b7280] mt-1 leading-relaxed">
              Default equipment specs, economic parameters, and grid data
            </p>
          </Link>

          <Link href="/tutorial" className="group">
            <div className="bg-[#f0ecf5] rounded-2xl aspect-[16/10] flex items-center justify-center mb-3 transition-all group-hover:shadow-md">
              <Image
                src="/Icons/Icons/Efficiency/Road sign direction.svg"
                alt=""
                width={64}
                height={64}
                className="opacity-25 group-hover:opacity-40 transition-opacity"
              />
            </div>
            <h3 className="text-[15px] font-medium text-[#2c3e50] group-hover:text-[#6b5b8a] transition-colors">
              Tutorial
            </h3>
            <p className="text-[13px] text-[#6b7280] mt-1 leading-relaxed">
              Step-by-step guide to using the PiECE Tool
            </p>
          </Link>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="max-w-[1400px] mx-auto px-5 lg:px-8 mt-20">
        <div className="border-t border-gray-300 pt-8">
          <h3 className="text-[13px] font-medium text-[#2c3e50] mb-3">Disclaimer</h3>
          <p className="text-[12px] text-[#9ca3af] leading-[1.8] max-w-3xl">
            This tool has been prepared for informational and planning purposes only. The content
            is based on publicly available data, industry benchmarks, and standard engineering
            assumptions. While every effort has been made to ensure accuracy, the authors do not
            guarantee the completeness or suitability of the information for any specific purpose.
            Users are encouraged to consult with qualified engineers and advisors before making
            investment decisions based on the results presented herein.
          </p>
        </div>
      </div>
    </div>
  )
}
