'use client'

import { useEffect, useRef } from 'react'
import type { RealmScene, RealmSceneOptions } from '@/lib/realm/RealmScene'

interface Props {
  options: RealmSceneOptions
  onReady?: (scene: RealmScene) => void
  className?: string
  label: string
}

/** Monta a cena 3D do reino num contêiner. O módulo three.js só carrega no cliente. */
export function RealmCanvas({ options, onReady, className, label }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const readyRef = useRef(onReady)
  readyRef.current = onReady

  useEffect(() => {
    let scene: RealmScene | null = null
    let cancelled = false
    import('@/lib/realm/RealmScene').then(({ RealmScene }) => {
      if (cancelled || !ref.current) return
      scene = new RealmScene(ref.current, options)
      readyRef.current?.(scene)
    })
    return () => {
      cancelled = true
      scene?.dispose()
    }
    // As opções são fixas durante a vida do componente
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <div ref={ref} className={className} role="img" aria-label={label} />
}

/** Prévia do moodboard: uma cidade construída em loop. */
export function RealmPreview() {
  return <RealmCanvas className="realm-preview" options={{ mode: 'preview' }} label="Render 3D ao vivo: engrenagens de latão erguem uma torre-farol, seção por seção." />
}
