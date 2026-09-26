'use client'

import { useEffect, useRef } from 'react'
import type { SigilId } from '@/lib/realm-data'
import { drawSigil } from '@/lib/sigil-canvas'

interface Props {
  sigil: SigilId
  color: string
  label: string
  /** Controla a revelação externamente (ex.: ScrollTrigger). Sem valor = revela sozinho ao entrar na tela. */
  reveal?: number
  className?: string
}

/** Sigilo ASCII animado (cintilação + forja). Respeita prefers-reduced-motion. */
export function AsciiSigil({ sigil, color, label, reveal, className }: Props) {
  const ref = useRef<HTMLCanvasElement>(null)
  const revealRef = useRef(reveal ?? 0)
  const controlled = reveal !== undefined
  revealRef.current = controlled ? reveal : revealRef.current

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let raf = 0
    let visible = false
    let start = 0
    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.max(1, canvas.clientWidth * ratio)
      canvas.height = Math.max(1, canvas.clientHeight * ratio)
    }
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting
      if (visible && !start) start = performance.now()
      if (visible) loop()
    })
    const loop = () => {
      cancelAnimationFrame(raf)
      const now = performance.now()
      if (!controlled) revealRef.current = reduced ? 1 : Math.min(1, (now - start) / 1600)
      drawSigil(ctx, sigil, canvas.width, canvas.height, { color, reveal: revealRef.current, time: reduced ? 0 : now / 1000 })
      if (visible && !reduced) raf = requestAnimationFrame(loop)
    }
    resize()
    io.observe(canvas)
    const onResize = () => {
      resize()
      loop()
    }
    window.addEventListener('resize', onResize)
    return () => {
      cancelAnimationFrame(raf)
      io.disconnect()
      window.removeEventListener('resize', onResize)
    }
  }, [sigil, color, controlled])

  return <canvas ref={ref} className={`ascii-sigil ${className ?? ''}`} role="img" aria-label={label} />
}
