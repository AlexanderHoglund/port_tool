'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function SavedPortsRedirect() {
  const router = useRouter()
  useEffect(() => { router.replace('/piece') }, [router])
  return (
    <div className="py-16 text-center text-sm text-[#8c8c8c]">
      Redirecting to Projects...
    </div>
  )
}
