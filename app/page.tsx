import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12">
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

          <Link
            href="/shipping"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold text-lg py-4 px-12 rounded-xl transition-colors shadow-lg"
          >
            Launch Energy Transition Tool →
          </Link>
        </div>
      </div>
    </div>
  )
}
