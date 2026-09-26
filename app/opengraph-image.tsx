import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { ImageResponse } from 'next/og'
import { houses } from '@/lib/realm-data'

export const alt = 'Jorge Mesquita — O Reino dos Sistemas. Portfólio de ADS e Engenharia de Software.'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

/** Card de compartilhamento (LinkedIn, WhatsApp…): obsidiana, latão e as seis casas. */
export default function OpengraphImage() {
  const svg = readFileSync(join(process.cwd(), 'app', 'icon.svg'), 'utf8')
  const gear = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '0 90px',
          background: 'radial-gradient(ellipse at 70% 40%, #2a241b 0%, #0b0a09 65%)',
          color: '#d9ccae',
          fontFamily: 'serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, fontSize: 22, letterSpacing: 6, color: '#8c8577', textTransform: 'uppercase' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={gear} width={64} height={64} alt="" />
          Portfólio · ADS · Engenharia de Software
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 30, fontSize: 92, letterSpacing: 9, textTransform: 'uppercase', lineHeight: 0.98 }}>
          <span>Jorge</span>
          <span>Mesquita</span>
        </div>
        <div style={{ marginTop: 18, fontSize: 30, letterSpacing: 16, color: '#b08d57', textTransform: 'uppercase' }}>O Reino dos Sistemas</div>
        <div style={{ display: 'flex', marginTop: 34, width: 1020, height: 2, background: 'linear-gradient(90deg, #b08d57, rgba(176,141,87,0.15) 70%, transparent)' }} />
        <div style={{ display: 'flex', marginTop: 26, fontSize: 17, textTransform: 'uppercase' }}>
          {houses.map((h) => (
            <div key={h.section} style={{ display: 'flex', alignItems: 'center', marginRight: 34, color: '#8c8577', whiteSpace: 'nowrap' }}>
              <div style={{ width: 11, height: 11, marginRight: 11, background: h.color, transform: 'rotate(45deg)' }} />
              {h.seat}
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  )
}
