import { describe, expect, it } from 'vitest'
import { EMAIL, GITHUB, LINKEDIN, copy } from '@/lib/content'
import { houses } from '@/lib/realm-data'
import { sigils } from '@/lib/sigils'

/** Forma do objeto: chaves e tamanhos de listas, sem os textos. */
function shape(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(shape)
  if (v && typeof v === 'object') return Object.fromEntries(Object.keys(v).sort().map((k) => [k, shape((v as Record<string, unknown>)[k])]))
  return typeof v
}

describe('conteúdo', () => {
  it('português e inglês têm a mesma estrutura', () => {
    expect(shape(copy.en)).toEqual(shape(copy['pt-BR']))
  })

  it('links e e-mail são válidos', () => {
    for (const url of [GITHUB, LINKEDIN]) expect(url).toMatch(/^https:\/\//)
    expect(EMAIL).toMatch(/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/)
    for (const p of copy['pt-BR'].projects) for (const l of p.links) expect(l.url).toMatch(/^https:\/\//)
  })

  it('cada casa tem seção no menu, sigilo desenhado e posição única', () => {
    expect(houses).toHaveLength(6)
    const nav = copy['pt-BR'].nav as Record<string, string>
    const seen = new Set<string>()
    for (const h of houses) {
      expect(nav[h.section]).toBeTruthy()
      expect(sigils[h.sigil]).toBeTruthy()
      const key = `${h.position.x},${h.position.z}`
      expect(seen.has(key)).toBe(false)
      seen.add(key)
    }
  })
})
