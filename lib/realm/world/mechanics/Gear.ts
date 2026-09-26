import * as THREE from 'three';
import { materials } from '../../scene/materials';
import { bake, cylinder, box, mesh } from '../geometry';

export interface GearSpec {
  teeth: number;
  /** Módulo: tamanho do dente. Engrenagens em contato precisam do mesmo módulo. */
  module: number;
  thickness: number;
  spokes?: boolean;
  material?: THREE.Material;
}

const geometryCache = new Map<string, THREE.ExtrudeGeometry>();

/** Engrenagem procedural: dentes trapezoidais, furo do eixo, furos de alívio. Gira em torno de Z. */
export function gearGeometry(spec: GearSpec): THREE.ExtrudeGeometry {
  const key = `${spec.teeth}|${spec.module}|${spec.thickness}|${spec.spokes ? 1 : 0}`;
  const cached = geometryCache.get(key);
  if (cached) return cached;

  const z = spec.teeth;
  const m = spec.module;
  const pitchR = (m * z) / 2;
  const outerR = pitchR + m;
  const rootR = pitchR - 1.25 * m;
  const p = (Math.PI * 2) / z;

  const shape = new THREE.Shape();
  const pt = (r: number, a: number) => new THREE.Vector2(Math.cos(a) * r, Math.sin(a) * r);
  for (let i = 0; i < z; i++) {
    const a = i * p; // dente i centrado em a; o dente 0 fica em 0 rad (usado no cálculo de fase)
    const pts = [pt(rootR, a - 0.3 * p), pt(outerR, a - 0.13 * p), pt(outerR, a + 0.13 * p), pt(rootR, a + 0.3 * p), pt(rootR, a + 0.5 * p)];
    pts.forEach((v, j) => (i === 0 && j === 0 ? shape.moveTo(v.x, v.y) : shape.lineTo(v.x, v.y)));
  }
  shape.closePath();

  const bore = Math.max(pitchR * 0.1, 0.03);
  const borePath = new THREE.Path();
  borePath.absarc(0, 0, bore, 0, Math.PI * 2, true);
  shape.holes.push(borePath);

  if (spec.spokes) {
    const hubR = Math.max(bore * 2.2, pitchR * 0.26);
    const rimR = rootR - Math.max(m * 1.4, pitchR * 0.1);
    if (rimR - hubR > pitchR * 0.22) {
      const n = z > 30 ? 6 : 5;
      const c = (hubR + rimR) / 2;
      const hr = Math.min((rimR - hubR) * 0.42, c * Math.sin(Math.PI / n) * 0.8);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + Math.PI / n;
        const h = new THREE.Path();
        h.absarc(Math.cos(a) * c, Math.sin(a) * c, hr, 0, Math.PI * 2, true);
        shape.holes.push(h);
      }
    }
  }

  const bevel = Math.min(0.02, m * 0.15);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: spec.thickness - bevel * 2,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 1,
    curveSegments: 10,
  });
  geo.translate(0, 0, -spec.thickness / 2 + bevel);
  geometryCache.set(key, geo);
  return geo;
}

export function disposeGearCache(): void {
  geometryCache.forEach((g) => g.dispose());
  geometryCache.clear();
  fullCache.forEach((g) => g.dispose());
  fullCache.clear();
}

const fullCache = new Map<string, THREE.BufferGeometry>();

/** Corpo + cubo + marcador radial fundidos numa geometria só (1 draw call por engrenagem). */
function fullGearGeometry(spec: GearSpec, hubR: number): THREE.BufferGeometry {
  const key = `${spec.teeth}|${spec.module}|${spec.thickness}|${spec.spokes ? 1 : 0}`;
  const cached = fullCache.get(key);
  if (cached) return cached;
  const g = new THREE.Group();
  g.add(mesh(gearGeometry(spec), materials.steel));
  const hub = mesh(cylinder(hubR, hubR, spec.thickness * 1.5, 18), materials.steel);
  hub.rotation.x = Math.PI / 2;
  // Marcador radial no cubo: torna a rotação legível mesmo em engrenagens pequenas.
  const mark = mesh(box(hubR * 0.9, hubR * 0.3, spec.thickness * 1.6), materials.steel);
  mark.position.x = hubR * 0.5;
  g.add(hub, mark);
  bake(g);
  const geo = (g.children[0] as THREE.Mesh).geometry;
  fullCache.set(key, geo);
  return geo;
}

export class Gear extends THREE.Group {
  readonly teeth: number;
  readonly pitchRadius: number;
  readonly hubRadius: number;
  /** Parte que gira. O grupo externo só posiciona. */
  readonly rotor = new THREE.Group();

  constructor(readonly spec: GearSpec) {
    super();
    this.teeth = spec.teeth;
    this.pitchRadius = (spec.module * spec.teeth) / 2;
    this.hubRadius = Math.round(Math.max(this.pitchRadius * 0.24, 0.06) * 100) / 100;
    this.rotor.add(mesh(fullGearGeometry(spec, this.hubRadius), spec.material ?? materials.brass));
    this.add(this.rotor);
  }

  /** Eixo fixo para ser incluído na estrutura estática do dono (posição local ao dono). */
  axleMesh(ownerOffset = new THREE.Vector3()): THREE.Mesh {
    const r = this.hubRadius * 0.45;
    const axle = mesh(cylinder(r, r, this.spec.thickness * 3.2, 10), materials.iron);
    axle.rotation.x = Math.PI / 2;
    axle.position.copy(this.position).add(ownerOffset);
    axle.position.z -= this.spec.thickness;
    return axle;
  }

  set angle(a: number) {
    this.rotor.rotation.z = a;
  }
  get angle(): number {
    return this.rotor.rotation.z;
  }
}

interface TrainNode {
  gear: Gear;
  parent: TrainNode | null;
  /** Ângulo da linha de centros pai→filho (engrenamento externo). */
  theta: number;
  coaxial: boolean;
}

/**
 * Trem de engrenagens num plano XY local. Posiciona cada engrenagem na
 * distância correta (soma dos raios primitivos) e calcula a fase para que os
 * dentes realmente se encaixem. Engrenagens em contato giram em sentidos
 * opostos, com razão zPai/zFilho.
 */
export class GearTrain extends THREE.Group {
  private nodes: TrainNode[] = [];

  addRoot(gear: Gear, x = 0, y = 0, z = 0): Gear {
    gear.position.set(x, y, z);
    this.add(gear);
    this.nodes.push({ gear, parent: null, theta: 0, coaxial: false });
    return gear;
  }

  /** Engrena `gear` externamente em `parent`, na direção `theta` (rad). */
  addMeshed(gear: Gear, parent: Gear, theta: number): Gear {
    const pn = this.find(parent);
    const d = parent.pitchRadius + gear.pitchRadius;
    gear.position.set(parent.position.x + Math.cos(theta) * d, parent.position.y + Math.sin(theta) * d, parent.position.z);
    this.add(gear);
    this.nodes.push({ gear, parent: pn, theta, coaxial: false });
    return gear;
  }

  /** Engrenagem no mesmo eixo do pai (gira junto), deslocada em z. */
  addCoaxial(gear: Gear, parent: Gear, dz: number): Gear {
    const pn = this.find(parent);
    gear.position.set(parent.position.x, parent.position.y, parent.position.z + dz);
    this.add(gear);
    this.nodes.push({ gear, parent: pn, theta: 0, coaxial: true });
    return gear;
  }

  /** Define o ângulo da engrenagem motriz e propaga pelo trem. */
  setDrive(angle: number): void {
    for (const n of this.nodes) {
      if (!n.parent) {
        n.gear.angle = angle;
      } else if (n.coaxial) {
        n.gear.angle = n.parent.gear.angle;
      } else {
        const k = n.parent.gear.teeth / n.gear.teeth;
        // Dente do pai na direção θ ⇒ vão do filho na direção θ+π
        n.gear.angle = -n.parent.gear.angle * k + n.theta * (1 + k) + Math.PI - Math.PI / n.gear.teeth;
      }
    }
  }

  get gears(): Gear[] {
    return this.nodes.map((n) => n.gear);
  }

  private find(g: Gear): TrainNode {
    const n = this.nodes.find((x) => x.gear === g);
    if (!n) throw new Error('Gear not in train');
    return n;
  }
}
