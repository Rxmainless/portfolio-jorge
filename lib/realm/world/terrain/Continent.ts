import * as THREE from 'three'
import { createLampMaterial, materials } from '../../scene/materials'
import { bake, box, mesh } from '../geometry'
import { Gear, GearTrain } from '../mechanics/Gear'
import type { SkillSite } from '../SkillSite'
import { GROUND_T } from '../SkillSite'
import { fbm } from './noise'

type V2 = THREE.Vector2

interface Road {
  a: SkillSite
  b: SkillSite
  sea: boolean
  mat: THREE.MeshStandardMaterial | THREE.LineDashedMaterial
  gearbox: GearTrain | null
  energy: number
  target: number
  angle: number
}

const TERRAIN = 0x2a241b
const TERRACE_TOP = 0x3d3325
const BORDER = 0x6b5838
const CONTOUR = 0x3b3226
const SEA = 0x0a1114

/**
 * Continente procedural original (não é o mapa de Westeros): massa alongada
 * norte–sul, uma ilha a leste, costa com ruído. Norte = z negativo.
 */
export function continentOutlines(): V2[][] {
  const main: V2[] = []
  const zN = -122
  const zS = 116
  const half = (z: number) => {
    if (z < -40) return 40
    if (z < -12) return THREE.MathUtils.lerp(40, 30, (z + 40) / 28)
    if (z < 8) return THREE.MathUtils.lerp(30, 47, (z + 12) / 20)
    if (z < 70) return 47
    return THREE.MathUtils.lerp(47, 30, (z - 70) / 46)
  }
  const center = (z: number) => (z < 20 ? -2 : THREE.MathUtils.lerp(-2, -10, Math.min(1, (z - 20) / 60)))
  const steps = 90
  const edge = (z: number, side: number) => {
    const n = (fbm(z * 0.05 + (side > 0 ? 11 : 37), side * 3.1) - 0.5) * 12
    return center(z) + side * (half(z) + n)
  }
  for (let i = 0; i <= steps; i++) {
    const z = zN + ((zS - zN) * i) / steps
    main.push(new THREE.Vector2(edge(z, 1), z))
  }
  for (let i = steps; i >= 0; i--) {
    const z = zN + ((zS - zN) * i) / steps
    main.push(new THREE.Vector2(edge(z, -1), z))
  }
  // Ilha a leste
  const island: V2[] = []
  const ic = new THREE.Vector2(58, -14)
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2
    const r = 17 + (fbm(Math.cos(a) * 1.6 + 5, Math.sin(a) * 1.6 + 9) - 0.5) * 7
    island.push(new THREE.Vector2(ic.x + Math.cos(a) * r, ic.y + Math.sin(a) * r * 1.1))
  }
  return [main, island]
}

export function pointInPolygon(p: V2, poly: V2[]): boolean {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i]
    const b = poly[j]
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside
  }
  return inside
}

export class Continent extends THREE.Group {
  readonly roads: Road[] = []
  readonly regions: { site: SkillSite; fill: THREE.MeshBasicMaterial; level: number; target: number }[] = []
  private readonly lands: V2[][]
  private readonly field: (x: number, z: number) => number
  private readonly pathSegments: [V2, V2][] = []
  private readonly landMat = new THREE.MeshStandardMaterial({ color: TERRAIN, roughness: 0.95, metalness: 0.04 })

  constructor(private readonly sites: SkillSite[], roadPairs: [string, string][]) {
    super()
    this.lands = continentOutlines()

    // Terra: uma laje por massa de terra, com os poços das cidades; escreve stencil
    this.landMat.stencilWrite = true
    this.landMat.stencilRef = 1
    this.landMat.stencilZPass = THREE.ReplaceStencilOp
    for (const land of this.lands) {
      const shape = new THREE.Shape(land.map((p) => new THREE.Vector2(p.x, -p.y)))
      for (const s of sites) {
        const c = new THREE.Vector2(s.position.x, s.position.z)
        if (!pointInPolygon(c, land)) continue
        const h = s.pitHalf
        shape.holes.push(new THREE.Path([new THREE.Vector2(c.x - h, -c.y - h), new THREE.Vector2(c.x - h, -c.y + h), new THREE.Vector2(c.x + h, -c.y + h), new THREE.Vector2(c.x + h, -c.y - h)]))
      }
      const geo = new THREE.ExtrudeGeometry(shape, { depth: GROUND_T, bevelEnabled: false })
      geo.rotateX(-Math.PI / 2)
      geo.translate(0, -GROUND_T, 0)
      this.add(mesh(geo, this.landMat, false, true))
    }

    // Mar
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(1200, 1200), new THREE.MeshStandardMaterial({ color: SEA, roughness: 0.6, metalness: 0.3, envMapIntensity: 0.25 }))
    sea.rotation.x = -Math.PI / 2
    sea.position.y = -0.55
    sea.receiveShadow = true
    this.add(sea)

    const centers = sites.map((s) => new THREE.Vector2(s.position.x, s.position.z))
    this.field = (x, z) => {
      let d = Infinity
      for (let i = 0; i < centers.length; i++) d = Math.min(d, Math.hypot(x - centers[i].x, z - centers[i].y) - sites[i].radius)
      return d + (fbm(x * 0.045 + 7.1, z * 0.045 - 3.3) - 0.5) * 9
    }

    this.buildRegions(centers)
    this.buildRoads(roadPairs)
    this.buildContours()
    this.buildTerraces()
    this.buildWall()
  }

  onLand(p: V2, margin = 0): boolean {
    if (!this.lands.some((l) => pointInPolygon(p, l))) return false
    if (margin <= 0) return true
    for (const [dx, dz] of [[margin, 0], [-margin, 0], [0, margin], [0, -margin]]) if (!this.lands.some((l) => pointInPolygon(new THREE.Vector2(p.x + dx, p.y + dz), l))) return false
    return true
  }

  setRegionHighlight(id: string | null, level: number): void {
    for (const r of this.regions) r.target = r.site.config.id === id ? level : 0
  }

  refreshRoads(): void {
    for (const r of this.roads) r.target = r.a.built && r.b.built ? 1 : 0
  }

  update(dt: number): void {
    const k = Math.min(1, dt * 4)
    for (const r of this.regions) {
      r.level += (r.target - r.level) * k
      r.fill.opacity = 0.035 + r.level * 0.06
    }
    for (const r of this.roads) {
      r.energy += (r.target - r.energy) * Math.min(1, dt * 1.5)
      if (r.mat instanceof THREE.MeshStandardMaterial) r.mat.emissiveIntensity = r.energy * 1.1
      else r.mat.opacity = 0.25 + r.energy * 0.6
      if (r.gearbox) {
        r.angle += dt * 0.8 * r.energy
        r.gearbox.setDrive(r.angle)
      }
    }
  }

  // ————————————————————————————— regiões (Voronoi recortado pela terra)

  private buildRegions(centers: V2[]): void {
    const B = { minX: -140, maxX: 140, minZ: -140, maxZ: 140 }
    const rect = [new THREE.Vector2(B.minX, B.minZ), new THREE.Vector2(B.maxX, B.minZ), new THREE.Vector2(B.maxX, B.maxZ), new THREE.Vector2(B.minX, B.maxZ)]
    const borderPts: THREE.Vector3[] = []
    centers.forEach((c, i) => {
      let poly = rect.map((p) => p.clone())
      centers.forEach((o, j) => {
        if (i !== j) poly = clipHalfPlane(poly, c, o)
      })
      const inset = poly.map((p) => {
        const d = c.clone().sub(p)
        return d.length() > 0.7 ? p.clone().addScaledVector(d, 0.7 / d.length()) : p.clone()
      })
      // Fronteiras: subdivididas, só sobre a terra
      for (let k = 0; k < inset.length; k++) {
        const a = inset[k]
        const b = inset[(k + 1) % inset.length]
        const n = Math.ceil(a.distanceTo(b) / 1.2)
        for (let s = 0; s < n; s++) {
          const p0 = a.clone().lerp(b, s / n)
          const p1 = a.clone().lerp(b, (s + 1) / n)
          if (this.onLand(p0.clone().lerp(p1, 0.5))) borderPts.push(new THREE.Vector3(p0.x, 0.02, p0.y), new THREE.Vector3(p1.x, 0.02, p1.y))
        }
      }
      // Preenchimento na cor da casa, recortado pela terra via stencil
      const site = this.sites[i]
      const shape = new THREE.Shape(inset.map((p) => new THREE.Vector2(p.x, -p.y)))
      const h = site.pitHalf + 0.8
      shape.holes.push(new THREE.Path([new THREE.Vector2(c.x - h, -c.y - h), new THREE.Vector2(c.x - h, -c.y + h), new THREE.Vector2(c.x + h, -c.y + h), new THREE.Vector2(c.x + h, -c.y - h)]))
      const geo = new THREE.ShapeGeometry(shape)
      geo.rotateX(-Math.PI / 2)
      const fill = new THREE.MeshBasicMaterial({ color: site.config.color, transparent: true, opacity: 0.035, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 })
      fill.stencilWrite = true
      fill.stencilRef = 1
      fill.stencilFunc = THREE.EqualStencilFunc
      fill.stencilZPass = THREE.KeepStencilOp
      const m = new THREE.Mesh(geo, fill)
      m.position.y = 0.004
      this.add(m)
      this.regions.push({ site, fill, level: 0, target: 0 })
    })
    const border = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(borderPts), new THREE.LineDashedMaterial({ color: BORDER, dashSize: 0.9, gapSize: 0.7 }))
    border.computeLineDistances()
    this.add(border)
  }

  // ————————————————————————————— estradas e rotas marítimas

  private gate(site: SkillSite, toward: V2): { gate: V2; out: V2 } {
    const c = new THREE.Vector2(site.position.x, site.position.z)
    const dir = toward.clone().sub(c).normalize()
    const options = [new THREE.Vector2(1, 0), new THREE.Vector2(-1, 0), new THREE.Vector2(0, 1)]
    let best = options[0]
    for (const o of options) if (o.dot(dir) > best.dot(dir)) best = o
    const r = site.pitHalf + 2.4
    return { gate: c.clone().addScaledVector(best, r), out: c.clone().addScaledVector(best, r + 3.5) }
  }

  private buildRoads(pairs: [string, string][]): void {
    const byId = new Map(this.sites.map((s) => [s.config.id, s]))
    const pylonMatrices: THREE.Matrix4[] = []
    const wire: THREE.Vector3[] = []
    const q = new THREE.Quaternion()
    const up = new THREE.Vector3(0, 1, 0)

    for (const [ia, ib] of pairs) {
      const a = byId.get(ia)
      const b = byId.get(ib)
      if (!a || !b) continue
      const ac = new THREE.Vector2(a.position.x, a.position.z)
      const bc = new THREE.Vector2(b.position.x, b.position.z)
      const ga = this.gate(a, bc)
      const gb = this.gate(b, ac)
      let pts: V2[] = [ga.gate, ga.out, gb.out, gb.gate]
      pts = this.detour(pts, a, b)
      const sea = samplePolyline(pts, 2, 0).some((s) => !this.onLand(s.p))

      if (sea) {
        // Rota marítima: linha pontilhada sobre a água, sem torres
        const line = pts.map((p) => new THREE.Vector3(p.x, -0.45, p.y))
        const mat = new THREE.LineDashedMaterial({ color: 0xc9a86a, dashSize: 0.8, gapSize: 1.1, transparent: true, opacity: 0.25 })
        const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(new THREE.CatmullRomCurve3(line).getPoints(80)), mat)
        l.computeLineDistances()
        this.add(l)
        this.roads.push({ a, b, sea, mat, gearbox: null, energy: 0, target: 0, angle: 0 })
        continue
      }
      pts.forEach((p, i) => i > 0 && this.pathSegments.push([pts[i - 1], p]))

      const road = new THREE.Group()
      for (let i = 1; i < pts.length; i++) {
        const p0 = pts[i - 1]
        const p1 = pts[i]
        const seg = mesh(box(p0.distanceTo(p1), 0.02, 1.3), materials.terrainEdge, false, true)
        seg.position.set((p0.x + p1.x) / 2, 0.012, (p0.y + p1.y) / 2)
        seg.rotation.y = -Math.atan2(p1.y - p0.y, p1.x - p0.x)
        road.add(seg)
        if (i < pts.length - 1) {
          const joint = mesh(box(1.3, 0.02, 1.3), materials.terrainEdge, false, true)
          joint.position.set(p1.x, 0.012, p1.y)
          road.add(joint)
        }
      }
      this.add(bake(road, false, true))

      const mat = createLampMaterial(0xffd9a0)
      const dashes = samplePolyline(pts, 1.7, 1.2)
      const dm = new THREE.InstancedMesh(box(0.55, 0.03, 0.09), mat, dashes.length)
      const m4 = new THREE.Matrix4()
      dashes.forEach((d, i) => dm.setMatrixAt(i, m4.compose(new THREE.Vector3(d.p.x, 0.03, d.p.y), q.setFromAxisAngle(up, -d.angle), new THREE.Vector3(1, 1, 1))))
      this.add(dm)

      let prev: THREE.Vector3 | null = null
      for (const t of samplePolyline(pts, 11, 5)) {
        const nx = -Math.sin(t.angle)
        const nz = Math.cos(t.angle)
        const pos = new THREE.Vector3(t.p.x + nx * 1.7, 0, t.p.y + nz * 1.7)
        pylonMatrices.push(new THREE.Matrix4().compose(pos, q.setFromAxisAngle(up, -t.angle), new THREE.Vector3(1, 1, 1)))
        const tip = pos.clone().add(new THREE.Vector3(0, 3.15, 0))
        if (prev) {
          for (let k = 0; k < 8; k++) {
            const s0 = prev.clone().lerp(tip, k / 8)
            const s1 = prev.clone().lerp(tip, (k + 1) / 8)
            s0.y -= Math.sin((Math.PI * k) / 8) * 0.55
            s1.y -= Math.sin((Math.PI * (k + 1)) / 8) * 0.55
            wire.push(s0, s1)
          }
        }
        prev = tip
      }

      // Caixa de engrenagens semienterrada no meio do caminho
      const mid = samplePolyline(pts, 1e9, polylineLength(pts) / 2)[0]
      const gearbox = new GearTrain()
      const g1 = gearbox.addRoot(new Gear({ teeth: 18, module: 0.09, thickness: 0.16, spokes: true, material: materials.brass }))
      const g2 = gearbox.addMeshed(new Gear({ teeth: 10, module: 0.09, thickness: 0.16, material: materials.darkSteel }), g1, 0.4)
      gearbox.addMeshed(new Gear({ teeth: 13, module: 0.09, thickness: 0.16, material: materials.brass }), g2, -1.2)
      gearbox.rotation.x = -Math.PI / 2
      gearbox.position.y = 0.035
      const holder = new THREE.Group()
      holder.position.set(mid.p.x + Math.sin(mid.angle) * 2.9, 0, mid.p.y - Math.cos(mid.angle) * 2.9)
      holder.rotation.y = -mid.angle
      const plate = mesh(box(3.5, 0.03, 2.6), materials.iron, false, true)
      plate.position.set(0.6, 0.015, 0.05)
      holder.add(plate, gearbox)
      this.add(holder)

      this.roads.push({ a, b, sea, mat, gearbox, energy: 0, target: 0, angle: 0 })
    }

    const pylon = new THREE.Group()
    const pole = mesh(box(0.14, 3.2, 0.14), materials.darkSteel)
    pole.position.y = 1.6
    const arm = mesh(box(0.08, 0.08, 1.0), materials.darkSteel)
    arm.position.y = 3.1
    pylon.add(pole, arm)
    bake(pylon)
    const inst = new THREE.InstancedMesh((pylon.children[0] as THREE.Mesh).geometry, materials.darkSteel, Math.max(1, pylonMatrices.length))
    inst.count = pylonMatrices.length
    inst.castShadow = true
    pylonMatrices.forEach((m, i) => inst.setMatrixAt(i, m))
    this.add(inst)
    this.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(wire), new THREE.LineBasicMaterial({ color: 0x3a3226 })))
  }

  private detour(pts: V2[], a: SkillSite, b: SkillSite): V2[] {
    let mid = pts.slice(1, -1)
    for (let pass = 0; pass < 2; pass++) {
      const next: V2[] = [mid[0]]
      for (let i = 1; i < mid.length; i++) {
        let d: V2 | null = null
        for (const s of this.sites) {
          if (s === a || s === b) continue
          const c = new THREE.Vector2(s.position.x, s.position.z)
          const qp = closestOnSegment(c, mid[i - 1], mid[i])
          if (qp.distanceTo(c) < s.radius + 1.5) {
            const away = qp.clone().sub(c)
            if (away.lengthSq() < 1e-4) away.set(-(mid[i].y - mid[i - 1].y), mid[i].x - mid[i - 1].x)
            d = c.clone().addScaledVector(away.normalize(), s.radius + 4)
            break
          }
        }
        if (d) next.push(d)
        next.push(mid[i])
      }
      mid = next
    }
    return [pts[0], ...mid, pts[pts.length - 1]]
  }

  // ————————————————————————————— topografia

  private buildContours(): void {
    const levels = [2.5, 5.5, 8.5, 13]
    const step = 1
    const x0 = -110
    const z0 = -130
    const nx = 220
    const nz = 256
    const vals = new Float32Array((nx + 1) * (nz + 1))
    const land = new Uint8Array((nx + 1) * (nz + 1))
    for (let j = 0; j <= nz; j++)
      for (let i = 0; i <= nx; i++) {
        const k = j * (nx + 1) + i
        const p = new THREE.Vector2(x0 + i * step, z0 + j * step)
        vals[k] = this.field(p.x, p.y)
        land[k] = this.onLand(p) ? 1 : 0
      }
    const pts: THREE.Vector3[] = []
    const lerp = (a: number, b: number, l: number) => (l - a) / (b - a)
    for (const L of levels) {
      for (let j = 0; j < nz; j++) {
        for (let i = 0; i < nx; i++) {
          const k00 = j * (nx + 1) + i
          if (!land[k00] || !land[k00 + 1] || !land[k00 + nx + 1] || !land[k00 + nx + 2]) continue
          const v00 = vals[k00]
          const v10 = vals[k00 + 1]
          const v01 = vals[k00 + nx + 1]
          const v11 = vals[k00 + nx + 2]
          const idx = (v00 > L ? 1 : 0) | (v10 > L ? 2 : 0) | (v11 > L ? 4 : 0) | (v01 > L ? 8 : 0)
          if (idx === 0 || idx === 15) continue
          const x = x0 + i * step
          const z = z0 + j * step
          const e = [
            new THREE.Vector3(x + lerp(v00, v10, L) * step, 0.008, z),
            new THREE.Vector3(x + step, 0.008, z + lerp(v10, v11, L) * step),
            new THREE.Vector3(x + lerp(v01, v11, L) * step, 0.008, z + step),
            new THREE.Vector3(x, 0.008, z + lerp(v00, v01, L) * step),
          ]
          for (const [a, b] of MS_TABLE[idx]) pts.push(e[a], e[b])
        }
      }
    }
    this.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: CONTOUR })))
  }

  private buildTerraces(): void {
    const cell = 2
    const T0 = 10
    const items: { m: THREE.Matrix4; level: number }[] = []
    for (let x = -110; x <= 110; x += cell) {
      for (let z = -130; z <= 126; z += cell) {
        const f = this.field(x, z)
        if (f < T0) continue
        const p = new THREE.Vector2(x, z)
        if (!this.onLand(p, 2.5)) continue
        if (z < -112) continue // espaço da Muralha
        if (this.pathSegments.some(([a, b]) => closestOnSegment(p, a, b).distanceTo(p) < 4)) continue
        const level = Math.min(6, Math.floor((f - T0) / 3.2) + 1)
        const hgt = level * 0.42
        items.push({ m: new THREE.Matrix4().compose(new THREE.Vector3(x, hgt / 2, z), new THREE.Quaternion(), new THREE.Vector3(cell, hgt, cell)), level })
      }
    }
    const inst = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.92, metalness: 0.04 }), Math.max(1, items.length))
    inst.count = items.length
    const base = new THREE.Color(TERRAIN)
    const top = new THREE.Color(TERRACE_TOP)
    const col = new THREE.Color()
    items.forEach(({ m, level }, i) => {
      inst.setMatrixAt(i, m)
      inst.setColorAt(i, col.copy(base).lerp(top, level / 6))
    })
    inst.castShadow = true
    inst.receiveShadow = true
    this.add(inst)
  }

  /** A Muralha: faixa de gelo de costa a costa no extremo norte. */
  private buildWall(): void {
    const z = -114
    const xs: number[] = []
    for (let x = -80; x <= 80; x += 1) if (this.onLand(new THREE.Vector2(x, z))) xs.push(x)
    if (!xs.length) return
    const x0 = xs[0] + 1
    const x1 = xs[xs.length - 1] - 1
    const ice = new THREE.MeshStandardMaterial({ color: 0xbfd3de, roughness: 0.25, metalness: 0.1, emissive: 0x1c2a33, emissiveIntensity: 0.6 })
    const wall = new THREE.Group()
    const n = Math.ceil((x1 - x0) / 4)
    for (let i = 0; i < n; i++) {
      const w = (x1 - x0) / n
      const hgt = 6.5 + fbm(i * 0.7, 3) * 2.5
      const blk = mesh(box(+(w + 0.02).toFixed(3), +hgt.toFixed(2), 2.6), ice)
      blk.position.set(x0 + w * (i + 0.5), hgt / 2 - 0.2, z)
      wall.add(blk)
    }
    this.add(bake(wall))
  }

  dispose(): void {
    this.traverse((o) => {
      const m = o as THREE.Mesh
      if (m.isMesh || (o as THREE.Line).isLine) (m.geometry as THREE.BufferGeometry).dispose()
    })
    this.landMat.dispose()
  }
}

const MS_TABLE: [number, number][][] = [
  [], [[3, 0]], [[0, 1]], [[3, 1]], [[1, 2]], [[3, 0], [1, 2]], [[0, 2]], [[3, 2]],
  [[2, 3]], [[2, 0]], [[0, 1], [2, 3]], [[2, 1]], [[1, 3]], [[1, 0]], [[0, 3]], [],
]

function clipHalfPlane(poly: V2[], c: V2, o: V2): V2[] {
  const n = o.clone().sub(c)
  const m = c.clone().add(o).multiplyScalar(0.5)
  const inside = (p: V2) => p.clone().sub(m).dot(n) <= 0
  const out: V2[] = []
  for (let i = 0; i < poly.length; i++) {
    const cur = poly[i]
    const prev = poly[(i + poly.length - 1) % poly.length]
    if (inside(cur) !== inside(prev)) {
      const d = cur.clone().sub(prev)
      out.push(prev.clone().addScaledVector(d, m.clone().sub(prev).dot(n) / d.dot(n)))
    }
    if (inside(cur)) out.push(cur.clone())
  }
  return out
}

function closestOnSegment(p: V2, a: V2, b: V2): V2 {
  const ab = b.clone().sub(a)
  const t = THREE.MathUtils.clamp(p.clone().sub(a).dot(ab) / Math.max(ab.lengthSq(), 1e-9), 0, 1)
  return a.clone().addScaledVector(ab, t)
}

function polylineLength(pts: V2[]): number {
  let L = 0
  for (let i = 1; i < pts.length; i++) L += pts[i - 1].distanceTo(pts[i])
  return L
}

function samplePolyline(pts: V2[], spacing: number, offset: number): { p: V2; angle: number }[] {
  const out: { p: V2; angle: number }[] = []
  const total = polylineLength(pts)
  for (let s = offset; s <= total - Math.min(offset, 1); s += spacing) {
    let acc = 0
    for (let i = 1; i < pts.length; i++) {
      const len = pts[i - 1].distanceTo(pts[i])
      if (acc + len >= s) {
        out.push({ p: pts[i - 1].clone().lerp(pts[i], (s - acc) / len), angle: Math.atan2(pts[i].y - pts[i - 1].y, pts[i].x - pts[i - 1].x) })
        break
      }
      acc += len
    }
  }
  return out
}
