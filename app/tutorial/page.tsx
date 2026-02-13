import Image from 'next/image'
import Link from 'next/link'

const STEPS = [
  {
    number: 1,
    title: 'Create a Project',
    icon: '/Icons/Icons/Business/Documents.svg',
    color: '#3c5e86',
    bgColor: '#e8f0f8',
    borderColor: '#d4eefa',
    summary: 'Set up a new port project to organise your baseline and scenarios.',
    details: [
      'Navigate to the Projects page within the PiECE Tool',
      'Click "+ New Project" and enter a project name',
      'Add port details: name, location, and optional size category',
      'The project stores your baseline and can hold multiple electrification scenarios',
    ],
    tip: 'Use the optional port size category to auto-populate realistic default values for equipment and vessel traffic.',
  },
  {
    number: 2,
    title: 'Configure the Port Baseline',
    icon: '/Icons/Icons/Business/Container.svg',
    color: '#3c5e86',
    bgColor: '#e8f0f8',
    borderColor: '#d4eefa',
    summary: 'Define your current port setup — terminals, berths, equipment, and vessel traffic.',
    details: [
      'Set port identity and size in Section 1 (Port Information)',
      'Add terminals — container, RoRo, or cruise — each with their own berths',
      'Enter existing equipment counts (diesel and electric) per terminal',
      'Configure vessel calls: segment type, annual calls, and average berth hours',
      'Define offshore equipment at the port level (tugs and pilot boats)',
    ],
    tip: 'Select a port size and click "Load Typical Values" to populate realistic defaults, then adjust to match your port.',
  },
  {
    number: 3,
    title: 'Define an Electrification Scenario',
    icon: '/Icons/Icons/Energy & Fuels/Electric power.svg',
    color: '#286464',
    bgColor: '#eefae8',
    borderColor: '#dcf0d6',
    summary: 'Choose what to electrify — equipment, shore power berths, and charging infrastructure.',
    details: [
      'Select which diesel equipment to convert to electric per terminal',
      'Add new electric units beyond the existing fleet',
      'Enable onshore power supply (OPS) on individual berths',
      'Configure offshore equipment electrification (tugs, pilot boats)',
      'Optionally override the charger type assigned to each equipment category',
    ],
    tip: 'Create multiple scenarios with different strategies — for example, one with full electrification and one with only OPS.',
  },
  {
    number: 4,
    title: 'Run the Calculation',
    icon: '/Icons/Icons/Efficiency/Gears.svg',
    color: '#bc8e54',
    bgColor: '#fcf8e4',
    borderColor: '#fceec8',
    summary: 'The PiECE engine computes CAPEX, OPEX, and CO\u2082 savings for your scenario.',
    details: [
      'Equipment CAPEX — conversion costs and new electric unit purchases',
      'EVSE infrastructure — chargers sized to each equipment category',
      'OPS infrastructure — shore power connections per enabled berth',
      'Grid infrastructure — substations, cabling, and switchgear',
      'Annual OPEX — diesel savings vs. electricity costs',
      'CO\u2082 reductions — per terminal and port-wide',
    ],
    tip: 'Results are saved automatically to your scenario. Switch between scenarios in the Results tab to compare outputs.',
  },
  {
    number: 5,
    title: 'Compare Scenarios',
    icon: '/Icons/Icons/Efficiency/Bar Chart.svg',
    color: '#7c5e8a',
    bgColor: '#f5f0f8',
    borderColor: '#ede4f2',
    summary: 'View side-by-side metrics to identify the most cost-effective electrification pathway.',
    details: [
      'Select 2–3 scenarios with calculated results',
      'Compare total CAPEX, annual OPEX savings, and payback period',
      'Review CO\u2082 reduction percentages across strategies',
      'Identify the optimal balance between investment and emission reduction',
    ],
    tip: 'Only scenarios with completed calculations appear in the comparison. Run the calculation for each scenario first.',
  },
  {
    number: 6,
    title: 'Customise Assumptions',
    icon: '/Icons/Icons/Efficiency/Layers.svg',
    color: '#5a7a5a',
    bgColor: '#f0f5ef',
    borderColor: '#dce8da',
    summary: 'Override default economic, equipment, or grid parameters for sensitivity analysis.',
    details: [
      'Navigate to the Project Assumptions page within the PiECE Tool',
      'Click any numeric cell to override the default value',
      'Overrides are shown in blue with the original in parentheses',
      'Each scenario maintains its own set of overrides',
      'Test different cost or emission factor assumptions independently',
    ],
    tip: 'Use the Useful Data page (main navigation) to review all default values before deciding what to override.',
  },
]

const OUTPUTS = [
  {
    label: 'Equipment CAPEX',
    description: 'Cost of converting and purchasing electric equipment',
    icon: '/Icons/Icons/Business/Investment.svg',
  },
  {
    label: 'OPS Infrastructure',
    description: 'Shore power connections and electrical systems per berth',
    icon: '/Icons/Icons/Energy & Fuels/Plug.svg',
  },
  {
    label: 'Grid Infrastructure',
    description: 'Substations, cabling, and switchgear for port-wide supply',
    icon: '/Icons/Icons/Energy & Fuels/Energy sources.svg',
  },
  {
    label: 'OPEX Savings',
    description: 'Annual operating cost difference: diesel vs. electricity',
    icon: '/Icons/Icons/Business/Price tag dollar.svg',
  },
  {
    label: 'CO\u2082 Reduction',
    description: 'Emission savings per terminal and port-wide',
    icon: '/Icons/Icons/Sustainability/Decarbonization.svg',
  },
  {
    label: 'Payback Period',
    description: 'Years to recover investment through operational savings',
    icon: '/Icons/Icons/Efficiency/Growth.svg',
  },
]

export default function TutorialPage() {
  return (
    <div className="pb-20">
      {/* Page header — MMMCZCS style */}
      <div className="max-w-[1400px] mx-auto px-5 lg:px-8 pt-10">
        <h1 className="text-[30px] sm:text-[48px] font-extralight text-[#2c3e50] leading-[1.15] tracking-[-0.02em] mb-4 max-w-3xl">
          How to Use the PiECE Tool
        </h1>
        <p className="text-[15px] text-[#6b7280] max-w-2xl leading-relaxed mb-10">
          A step-by-step guide to evaluating port electrification investments — from
          project setup through calculation and scenario comparison.
        </p>
      </div>

      {/* Process flow overview */}
      <div className="max-w-[1400px] mx-auto px-5 lg:px-8">
        <div className="border-t border-gray-300" />
        <div className="pt-8 pb-12">
          <h2 className="text-[13px] font-medium uppercase tracking-[0.08em] text-[#9ca3af] mb-6">
            Workflow Overview
          </h2>
          <div className="flex items-center justify-between gap-2 overflow-x-auto pb-2">
            {STEPS.map((step, i) => (
              <div key={step.number} className="flex items-center gap-2 shrink-0">
                <div className="flex flex-col items-center gap-2">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: step.bgColor, border: `1px solid ${step.borderColor}` }}
                  >
                    <Image src={step.icon} alt="" width={24} height={24} className="opacity-60" />
                  </div>
                  <span className="text-[10px] font-medium text-[#6b7280] text-center max-w-[80px] leading-tight">
                    {step.title}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className="text-[#d1d5db] text-lg mt-[-18px] mx-1">&rarr;</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Step-by-step guide */}
      <div className="max-w-[1400px] mx-auto px-5 lg:px-8">
        <div className="border-t border-gray-300" />
        <div className="pt-8">
          <h2 className="text-[13px] font-medium uppercase tracking-[0.08em] text-[#9ca3af] mb-8">
            Step-by-Step Guide
          </h2>

          <div className="space-y-0">
            {STEPS.map((step, i) => (
              <div key={step.number}>
                {/* Step card */}
                <div className="flex flex-col lg:flex-row gap-8 lg:gap-16 pb-12">
                  {/* Left column — step number + icon */}
                  <div className="lg:w-1/3 shrink-0">
                    <div className="flex items-start gap-4">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                        style={{ backgroundColor: step.color }}
                      >
                        {step.number}
                      </div>
                      <div>
                        <h3 className="text-[22px] font-light text-[#2c3e50] leading-snug">
                          {step.title}
                        </h3>
                        <p className="text-[14px] text-[#6b7280] mt-2 leading-relaxed">
                          {step.summary}
                        </p>
                      </div>
                    </div>

                    {/* Icon illustration */}
                    <div
                      className="mt-6 rounded-2xl aspect-[2/1] flex items-center justify-center"
                      style={{ backgroundColor: step.bgColor, border: `1px solid ${step.borderColor}` }}
                    >
                      <Image
                        src={step.icon}
                        alt=""
                        width={56}
                        height={56}
                        className="opacity-20"
                      />
                    </div>
                  </div>

                  {/* Right column — details + tip */}
                  <div className="lg:w-2/3">
                    {/* Checklist items */}
                    <div className="space-y-3 mb-6">
                      {step.details.map((detail, j) => (
                        <div key={j} className="flex items-start gap-3">
                          <div
                            className="w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold text-white"
                            style={{ backgroundColor: `${step.color}90` }}
                          >
                            {String.fromCharCode(97 + j)}
                          </div>
                          <span className="text-[15px] text-[#4b5563] leading-[1.75]">
                            {detail}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Tip callout */}
                    <div
                      className="px-5 py-4 rounded-r-lg"
                      style={{
                        backgroundColor: `${step.bgColor}`,
                        borderLeft: `3px solid ${step.color}`,
                      }}
                    >
                      <p className="text-[13px] leading-relaxed" style={{ color: step.color }}>
                        <strong className="font-medium">Tip:</strong> {step.tip}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Connector line between steps */}
                {i < STEPS.length - 1 && (
                  <div className="border-t border-gray-200 mb-12" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* What the tool calculates — output grid */}
      <div className="max-w-[1400px] mx-auto px-5 lg:px-8 mt-8">
        <div className="border-t border-gray-300" />
        <div className="pt-8 pb-12">
          <h2 className="text-[13px] font-medium uppercase tracking-[0.08em] text-[#9ca3af] mb-2">
            What the Tool Calculates
          </h2>
          <p className="text-[15px] text-[#6b7280] mb-8 max-w-2xl leading-relaxed">
            The PiECE engine produces a comprehensive breakdown across six key output categories.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {OUTPUTS.map((output) => (
              <div
                key={output.label}
                className="bg-white rounded-2xl border border-gray-200 p-5 text-center"
              >
                <div className="w-12 h-12 rounded-xl bg-[#f5f6f7] flex items-center justify-center mx-auto mb-3">
                  <Image src={output.icon} alt="" width={24} height={24} className="opacity-40" />
                </div>
                <h4 className="text-[13px] font-medium text-[#2c3e50] mb-1">
                  {output.label}
                </h4>
                <p className="text-[11px] text-[#9ca3af] leading-relaxed">
                  {output.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="max-w-[1400px] mx-auto px-5 lg:px-8">
        <div className="border-t border-gray-300" />
        <div className="pt-10 flex flex-col lg:flex-row gap-8 lg:gap-16">
          <div className="lg:w-1/3 shrink-0">
            <p className="text-[13px] text-[#9ca3af] leading-relaxed">
              Ready to evaluate your port&rsquo;s electrification pathway?
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
