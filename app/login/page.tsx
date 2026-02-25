'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })

      if (res.ok) {
        router.push('/')
        router.refresh()
      } else {
        setError('Wrong password')
      }
    } catch {
      setError('Something went wrong')
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8f6fa]">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-white rounded-2xl border border-gray-200 shadow-sm p-8"
      >
        <h1 className="text-lg font-semibold text-[#414141] mb-1">Port Hub Tool</h1>
        <p className="text-xs text-[#8c8c8c] mb-6">Enter password to continue</p>

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          autoFocus
          className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm text-[#414141] placeholder:text-[#bebebe] focus:outline-none focus:ring-2 focus:ring-[#7c5e8a]/30 focus:border-[#7c5e8a] mb-3"
        />

        {error && (
          <p className="text-xs text-red-500 mb-3">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading || !password}
          className="w-full py-2.5 rounded-lg bg-[#7c5e8a] text-white text-sm font-medium hover:bg-[#6a4e78] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Checking...' : 'Enter'}
        </button>
      </form>
    </div>
  )
}
