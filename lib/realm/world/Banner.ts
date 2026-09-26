import * as THREE from 'three'
import { materials } from '../scene/materials'
import { cylinder, mesh } from './geometry'
import type { SigilId } from '../../realm-data'
import { drawSigil } from '../../sigil-canvas'

const W = 2
const H = 3.4

/**
 * Estandarte da casa: mastro + tecido que ondula (vértices atualizados no lugar)
 * com o sigilo ASCII como textura. `hoist` 0→1 iça o tecido pelo mastro.
 */
export class Banner extends THREE.Group {
  private readonly cloth: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshStandardMaterial>
  private readonly base: Float32Array
  private readonly texture: THREE.CanvasTexture
  private readonly poleH: number

  constructor(sigil: SigilId, color: string, metal: string, cloth?: string, poleH = 7.4) {
    super()
    this.poleH = poleH
    const pole = mesh(cylinder(0.06, 0.08, poleH, 10), materials.darkSteel)
    pole.position.y = poleH / 2
    const finial = mesh(new THREE.ConeGeometry(0.12, 0.4, 8), materials.brass)
    finial.position.y = poleH + 0.2
    const bar = mesh(cylinder(0.035, 0.035, W + 0.3, 8), materials.brass)
    bar.rotation.z = Math.PI / 2
    bar.position.set(W / 2, 0, 0)
    this.add(pole, finial)

    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 436
    const ctx = canvas.getContext('2d')!
    // Tecido escuro: o sigilo leva a cor da casa; tecido colorido: o sigilo leva o metal
    const ink = cloth ? color : metal
    drawSigil(ctx, sigil, canvas.width, canvas.height, { color: ink, background: cloth ?? color, banner: true })
    // Escurece as bordas (tecido pesado)
    const g = ctx.createRadialGradient(128, 200, 60, 128, 218, 260)
    g.addColorStop(0, 'rgba(0,0,0,0)')
    g.addColorStop(1, 'rgba(0,0,0,0.45)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 256, 436)
    this.texture = new THREE.CanvasTexture(canvas)
    this.texture.colorSpace = THREE.SRGBColorSpace
    this.texture.anisotropy = 4

    const geo = new THREE.PlaneGeometry(W, H, 12, 18)
    geo.translate(W / 2, -H / 2, 0) // origem no canto superior junto ao mastro
    this.base = (geo.attributes.position.array as Float32Array).slice()
    const mat = new THREE.MeshStandardMaterial({ map: this.texture, side: THREE.DoubleSide, roughness: 0.88, metalness: 0.05 })
    this.cloth = new THREE.Mesh(geo, mat)
    this.cloth.castShadow = true
    const rig = new THREE.Group()
    rig.add(this.cloth, bar)
    rig.name = 'rig'
    this.add(rig)
    this.setHoist(0)
  }

  /** 0 = recolhido no pé do mastro, 1 = no topo. */
  setHoist(h: number): void {
    const rig = this.getObjectByName('rig')!
    const low = H + 0.15
    const high = this.poleH - 0.05
    rig.position.y = low + (high - low) * THREE.MathUtils.smoothstep(h, 0, 1)
  }

  update(time: number, wind = 1): void {
    const pos = this.cloth.geometry.attributes.position as THREE.BufferAttribute
    const a = pos.array as Float32Array
    for (let i = 0; i < a.length; i += 3) {
      const x = this.base[i]
      const y = this.base[i + 1]
      const f = x / W // preso no mastro, solto na ponta
      a[i + 2] = Math.sin(x * 2.1 - time * 2.4 + y * 0.55) * 0.2 * f * wind + Math.sin(x * 4.3 - time * 3.7) * 0.05 * f * wind
      a[i] = x - f * f * 0.08 * wind
    }
    pos.needsUpdate = true
    this.cloth.geometry.computeVertexNormals()
  }

  dispose(): void {
    this.texture.dispose()
    this.cloth.geometry.dispose()
    this.cloth.material.dispose()
  }
}
