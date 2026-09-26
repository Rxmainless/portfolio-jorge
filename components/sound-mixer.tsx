'use client'

import { useEffect, useRef, useState } from 'react'
import { DEFAULT_VOLUMES, type RealmAudio, type VolumeKind, type Volumes } from '@/lib/realm/audio/RealmAudio'
import type { Copy } from '@/lib/content'

const KEY = 'jorge-mix'
const KINDS: VolumeKind[] = ['master', 'music', 'sfx']

function load(): Volumes {
  try {
    const v = JSON.parse(window.localStorage.getItem(KEY) ?? 'null') as Partial<Volumes> | null
    if (!v) return { ...DEFAULT_VOLUMES }
    const out = { ...DEFAULT_VOLUMES }
    for (const k of KINDS) if (typeof v[k] === 'number') out[k] = Math.max(0, Math.min(1, v[k]!))
    return out
  } catch {
    return { ...DEFAULT_VOLUMES }
  }
}

/** Barra ASCII do nível: ▰▰▰▱▱ */
const meter = (v: number) => '▰'.repeat(Math.round(v * 8)).padEnd(8, '▱')

/** Regulador de som: geral, trilha e efeitos, lembrado entre visitas. */
export function SoundMixer({ audio, copy }: { audio: RealmAudio | null; copy: Copy['sound'] }) {
  const [open, setOpen] = useState(false)
  const [vol, setVol] = useState<Volumes>(DEFAULT_VOLUMES)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const v = load()
    setVol(v)
  }, [])
  useEffect(() => {
    if (!audio) return
    for (const k of KINDS) audio.setVolume(k, vol[k])
  }, [audio, vol])

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setOpen(false)
      rootRef.current?.querySelector<HTMLButtonElement>('.mixer-toggle')?.focus()
    }
    window.addEventListener('pointerdown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  const change = (k: VolumeKind, v: number) => {
    const next = { ...vol, [k]: v }
    setVol(next)
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next))
    } catch {}
  }

  return (
    <div className="sound-mixer" ref={rootRef}>
      <button type="button" className={`mixer-toggle ${open ? 'is-open' : ''}`} aria-expanded={open} aria-controls="sound-mixer-panel" aria-label={copy.mixer} title={copy.mixer} onClick={() => setOpen(!open)}>
        <span aria-hidden="true">⫶</span>
      </button>
      {open && (
        <div id="sound-mixer-panel" className="mixer-panel" role="group" aria-label={copy.mixer}>
          <p className="mixer-title">{copy.mixer}</p>
          {KINDS.map((k) => (
            <label key={k} className="mixer-row">
              <span className="mixer-name">{copy[k]}</span>
              <input type="range" min={0} max={100} step={1} value={Math.round(vol[k] * 100)} onChange={(e) => change(k, Number(e.target.value) / 100)} aria-valuetext={`${Math.round(vol[k] * 100)}%`} />
              <span className="mixer-meter" aria-hidden="true">
                {meter(vol[k])}
              </span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}
