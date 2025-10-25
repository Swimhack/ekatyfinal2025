'use client'

import { useEffect, useRef, useCallback } from 'react'

interface UseSoundOptions {
  volume?: number
  loop?: boolean
}

export function useSound(url: string, options: UseSoundOptions = {}) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const { volume = 1, loop = false } = options

  // Effect for cleanup on unmount or when URL changes
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [url])

  const play = useCallback(() => {
    if (typeof window === 'undefined') return

    // Lazily initialize the Audio element on first play
    if (!audioRef.current) {
      audioRef.current = new Audio(url)
    }

    // Set latest options and play
    audioRef.current.volume = volume
    audioRef.current.loop = loop
    audioRef.current.currentTime = 0
    audioRef.current.play().catch(err => {
      console.error('Error playing sound:', err)
    })
  }, [url, volume, loop])

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
  }, [])

  const setVolume = useCallback((newVolume: number) => {
    if (audioRef.current) {
      audioRef.current.volume = Math.max(0, Math.min(1, newVolume))
    }
  }, [])

  return { play, stop, setVolume }
}