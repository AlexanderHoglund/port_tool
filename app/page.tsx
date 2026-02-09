import Link from 'next/link'
import Image from 'next/image'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header with logo */}
      <header className="w-full py-4 px-6">
        <Link href="/" className="inline-block">
          <Image
            src="/200w.gif"
            alt="Port Hub Tool Logo"
            width={120}
            height={40}
            className="h-10 w-auto"
            priority
          />
        </Link>
      </header>

      {/* Main content */}
      <div className="flex items-center justify-center py-12">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-6xl font-bold text-gray-800 mb-4">
              Port Hub Tool
            </h1>
            <p className="text-gray-600 text-xl mb-8">
              Port Energy Transition Investment Planner
            </p>
            <p className="text-gray-500 text-base mb-12 max-w-2xl mx-auto">
              Evaluate the capital investment, operating costs, and CO2 savings of electrifying terminal tractors, building ammonia bunkering, installing shore power, and converting cranes.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/shipping"
                className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold text-lg py-4 px-12 rounded-xl transition-colors shadow-lg"
              >
                Energy Transition Tool →
              </Link>
              <Link
                href="/piece"
                className="inline-block bg-[#3c5e86] hover:bg-[#2a4566] text-white font-semibold text-lg py-4 px-12 rounded-xl transition-colors shadow-lg"
              >
                PIECE Tool →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
