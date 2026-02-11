'use client'

import { useEffect, useState } from 'react'

type Props = {
  status: 'idle' | 'saving' | 'saved' | 'error'
}

export default function SaveStatusIndicator({ status }: Props) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (status === 'saved') {
      setVisible(true)
      const timer = setTimeout(() => setVisible(false), 2000)
      return () => clearTimeout(timer)
    }
    setVisible(status !== 'idle')
  }, [status])

  if (!visible && status === 'idle') return null

  return (
    <span
      className={`text-xs font-medium transition-opacity duration-500 ${
        visible ? 'opacity-100' : 'opacity-0'
      } ${
        status === 'saving' ? 'text-[#8c8c8c]' :
        status === 'saved' ? 'text-[#286464]' :
        status === 'error' ? 'text-[#bf360c]' : ''
      }`}
    >
      {status === 'saving' && (
        <>
          <span className="inline-block w-3 h-3 border-2 border-[#8c8c8c] border-t-transparent rounded-full animate-spin mr-1.5 align-text-bottom" />
          Saving...
        </>
      )}
      {status === 'saved' && '\u2713 Saved'}
      {status === 'error' && 'Save failed'}
    </span>
  )
}
