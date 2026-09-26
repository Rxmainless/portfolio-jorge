import type { SigilId } from './realm-data'
import { sigilLines } from './sigils'

export interface SigilDrawOptions {
  color: string
  /** 0..1: fração de caracteres já "forjados". */
  reveal?: number
  /** Tempo (s) para cintilação. */
  time?: number
  /** Fundo opcional (bandeiras). */
  background?: string
  /** Moldura de estandarte (bandeiras 3D). */
  banner?: boolean
  fontFamily?: string
}

/** Hash determinístico por posição: ordem de revelação e cintilação estáveis. */
function h(x: number, y: number): number {
  let n = Math.imul(x, 374761393) + Math.imul(y, 668265263)
  n = Math.imul(n ^ (n >>> 13), 1274126177)
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295
}

/**
 * Desenha um sigilo ASCII centralizado no canvas. Usado pelo componente
 * <AsciiSigil> (DOM) e como textura das bandeiras na cena 3D.
 */
export function drawSigil(ctx: CanvasRenderingContext2D, id: SigilId, w: number, h0: number, o: SigilDrawOptions): void {
  const lines = sigilLines(id)
  const cols = Math.max(...lines.map((l) => l.length))
  const rows = lines.length
  const reveal = o.reveal ?? 1
  const t = o.time ?? 0
  ctx.clearRect(0, 0, w, h0)
  if (o.background) {
    ctx.fillStyle = o.background
    ctx.fillRect(0, 0, w, h0)
  }
  const pad = o.banner ? 0.16 : 0.06
  const cell = Math.min((w * (1 - pad * 2)) / (cols * 0.6), (h0 * (1 - pad * 2)) / rows)
  const cw = cell * 0.6
  const ox = (w - cols * cw) / 2
  const oy = (h0 - rows * cell) / 2 + (o.banner ? -h0 * 0.04 : 0)
  ctx.font = `${cell}px ${o.fontFamily ?? '"JetBrains Mono", ui-monospace, monospace'}`
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  ctx.shadowColor = o.color
  ctx.shadowBlur = cell * 0.5
  for (let y = 0; y < rows; y++) {
    const line = lines[y]
    for (let x = 0; x < line.length; x++) {
      const ch = line[x]
      if (ch === ' ') continue
      const r = h(x, y)
      // Revelação de cima para baixo com ruído: o sigilo é "forjado"
      const threshold = (y / rows) * 0.7 + r * 0.3
      if (threshold > reveal) continue
      const flicker = 0.78 + 0.22 * Math.sin(t * (1.5 + r * 3) + r * 40)
      const fresh = Math.min(1, (reveal - threshold) * 6)
      ctx.globalAlpha = flicker * fresh
      ctx.fillStyle = fresh < 1 ? '#fff4dc' : o.color
      ctx.fillText(ch, ox + x * cw, oy + y * cell)
    }
  }
  ctx.globalAlpha = 1
  ctx.shadowBlur = 0
  if (o.banner) {
    // Barra e franja do estandarte
    ctx.fillStyle = o.color
    ctx.globalAlpha = 0.55
    ctx.fillRect(w * 0.08, h0 * 0.035, w * 0.84, Math.max(2, h0 * 0.008))
    ctx.fillRect(w * 0.08, h0 * 0.84, w * 0.84, Math.max(2, h0 * 0.006))
    ctx.globalAlpha = 1
  }
}
