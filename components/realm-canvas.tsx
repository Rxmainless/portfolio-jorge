'use client'

import { useEffect, useRef } from 'react'
import type { RealmScene, RealmSceneOptions } from '@/lib/realm/RealmScene'

interface Props {
  options: RealmSceneOptions
  onReady?: (scene: RealmScene) => void
  /** Sem WebGL (aparelho antigo, aceleração desligada): a página segue sem o 3D. */
  onError?: () => void
  className?: string
  label: string
}

/** Monta a cena 3D do reino num contêiner. O módulo three.js só carrega no cliente. */
export function RealmCanvas({ options, onReady, onError, className, label }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const readyRef = useRef(onReady)
  readyRef.current = onReady
  const errorRef = useRef(onError)
  errorRef.current = onError

  useEffect(() => {
    let scene: RealmScene | null = null
    let cancelled = false
    import('@/lib/realm/RealmScene')
      .then(({ RealmScene }) => {
        if (cancelled || !ref.current) return
        if (!hasWebGL()) throw new Error('WebGL indisponível')
        scene = new RealmScene(ref.current, options)
        readyRef.current?.(scene)
      })
      .catch(() => {
        if (!cancelled) errorRef.current?.()
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

function hasWebGL(): boolean {
  try {
    const c = document.createElement('canvas')
    const gl = c.getContext('webgl2') ?? c.getContext('webgl')
    gl?.getExtension('WEBGL_lose_context')?.loseContext()
    return !!gl
  } catch {
    return false
  }
}

/** Prévia do moodboard: uma cidade construída em loop. */
export function RealmPreview() {
  return <RealmCanvas className="realm-preview" options={{ mode: 'preview' }} label="Render 3D ao vivo: engrenagens de latão erguem uma torre-farol, seção por seção." />
}
