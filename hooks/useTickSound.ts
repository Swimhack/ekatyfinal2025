'use client'

import { useCallback, useEffect, useRef } from 'react'

/**
 * Synthesised wheel tick.
 *
 * The repo ships spin.mp3 and win.mp3 but no tick asset, and an HTMLAudioElement
 * cannot retrigger fast enough for one click per wedge anyway, so the tick is a
 * very short WebAudio blip instead of another download.
 */
export function useTickSound() {
  const contextRef = useRef<AudioContext | null>(null)

  useEffect(() => {
    return () => {
      contextRef.current?.close().catch(() => undefined)
      contextRef.current = null
    }
  }, [])

  return useCallback(() => {
    if (typeof window === 'undefined') return

    const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioContextCtor) return

    try {
      if (!contextRef.current) contextRef.current = new AudioContextCtor()
      const context = contextRef.current
      if (context.state === 'suspended') void context.resume()

      const now = context.currentTime
      const oscillator = context.createOscillator()
      const gain = context.createGain()

      oscillator.type = 'square'
      oscillator.frequency.setValueAtTime(1150, now)
      gain.gain.setValueAtTime(0.05, now)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.035)

      oscillator.connect(gain).connect(context.destination)
      oscillator.start(now)
      oscillator.stop(now + 0.04)
    } catch {
      // Audio is a nice-to-have; never let it break a spin.
    }
  }, [])
}

export default useTickSound
