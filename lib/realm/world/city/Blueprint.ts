import type { CityArchetype, SkillCityConfig } from '../../types/skill';
import { rectCorners, type RectHole } from '../geometry';

/**
 * Blueprint: descrição puramente geométrica de uma cidade, derivada dos dados.
 * Coordenadas no frame da fundação (y=0 = topo da fundação).
 * O construtor (SkillCity) e a timeline não conhecem arquétipos — só blueprints.
 */
export interface CoreSpec {
  shape: 'box' | 'cyl';
  /** Seções telescópicas, da base para o topo (larguras decrescentes). */
  sections: { w: number; h: number }[];
  spire: boolean;
}

export interface SatelliteSpec {
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
  tiers: number;
  shape: 'box' | 'cyl' | 'gate';
  /** Rotação em Y (só para 'gate'): 0 ou π/2. */
  rot?: number;
  roofGear?: boolean;
}

export interface ConnectorSpec {
  /** pipe: desliza para fora do núcleo; bridge: ponte-elevador que sobe de uma fenda na fundação. */
  kind: 'pipe' | 'bridge';
  /** -1 = núcleo. */
  from: number;
  to: number;
  y: number;
}

export interface Blueprint {
  core: CoreSpec;
  satellites: SatelliteSpec[];
  connectors: ConnectorSpec[];
  foundation: { half: number; height: number };
}

const FOUNDATION_H = 1.8;
const TAU = Math.PI * 2;

function coreSections(base: number, count: number, h: number, shrink = 0.76): { w: number; h: number }[] {
  const out: { w: number; h: number }[] = [];
  let w = base;
  for (let i = 0; i < count; i++) {
    out.push({ w: +w.toFixed(3), h: +(h - i * 0.2).toFixed(3) });
    w *= shrink;
  }
  return out;
}

type Layout = Omit<Blueprint, 'foundation'>;

const layouts: Record<CityArchetype, (c: number) => Layout> = {
  // Python — módulos empilhados ligados ao núcleo por dutos
  pipeline: (c) => ({
    core: { shape: 'box', sections: coreSections(1.6, Math.min(3, 1 + Math.ceil(c / 2)), 3.4), spire: true },
    satellites: [
      { x: -1.9, z: 0, w: 1.15, d: 1.15, h: 2.8, tiers: 3, shape: 'box' },
      { x: 0.2, z: -1.9, w: 1.15, d: 1.15, h: 2.4 + c * 0.3, tiers: 4, shape: 'box', roofGear: true },
      { x: 1.9, z: 0.7, w: 1.15, d: 1.15, h: 2.0, tiers: 2, shape: 'box' },
    ],
    connectors: [
      { kind: 'pipe', from: -1, to: 0, y: 1.2 },
      { kind: 'pipe', from: -1, to: 1, y: 1.6 },
      { kind: 'pipe', from: -1, to: 2, y: 0.8 },
    ],
  }),

  // TypeScript — grade 2×2 de módulos iguais com contratos (pontes) entre vizinhos
  modular: (c) => {
    const s = 2.1;
    const h = 2.4 + c * 0.15;
    const sat = (x: number, z: number): SatelliteSpec => ({ x, z, w: 1.25, d: 1.25, h, tiers: 3, shape: 'box' });
    return {
      core: { shape: 'box', sections: coreSections(1.2, 3, 3.0, 0.72), spire: false },
      satellites: [sat(-s, -s), sat(s, -s), sat(s, s), sat(-s, s)],
      connectors: [
        { kind: 'bridge', from: 0, to: 1, y: 1.8 },
        { kind: 'bridge', from: 1, to: 2, y: 1.2 },
        { kind: 'bridge', from: 2, to: 3, y: 1.8 },
        { kind: 'bridge', from: 3, to: 0, y: 1.2 },
      ],
    };
  },

  // React — unidades idênticas repetidas em anel
  component: (c) => {
    const n = 6;
    const r = 2.55;
    const sats: SatelliteSpec[] = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + Math.PI / 6;
      sats.push({ x: +(Math.cos(a) * r).toFixed(3), z: +(Math.sin(a) * r).toFixed(3), w: 0.95, d: 0.95, h: 1.9 + c * 0.1, tiers: 2, shape: 'cyl' });
    }
    return {
      core: { shape: 'cyl', sections: coreSections(1.4, 2, 2.8, 0.7), spire: true },
      satellites: sats,
      connectors: sats.map((_, i) => ({ kind: 'bridge' as const, from: i, to: (i + 1) % n, y: 1.3 })),
    };
  },

  // SQL — silos de armazenamento + lajes empilhadas, fluxos entre eles
  storage: (c) => ({
    core: { shape: 'box', sections: coreSections(2.0, 2, 1.8, 0.82), spire: false },
    satellites: [
      { x: -2.1, z: -2.0, w: 1.1, d: 1.1, h: 2.4 + c * 0.2, tiers: 3, shape: 'cyl' },
      { x: 0, z: -2.4, w: 1.1, d: 1.1, h: 2.8 + c * 0.2, tiers: 3, shape: 'cyl' },
      { x: 2.1, z: -2.0, w: 1.1, d: 1.1, h: 2.4 + c * 0.2, tiers: 3, shape: 'cyl' },
      { x: 0, z: 2.5, w: 3.4, d: 1.0, h: 1.1, tiers: 2, shape: 'box' },
    ],
    connectors: [
      { kind: 'bridge', from: 0, to: 1, y: 1.6 },
      { kind: 'bridge', from: 1, to: 2, y: 1.6 },
      { kind: 'bridge', from: -1, to: 3, y: 0.7 },
    ],
  }),

  // Git — tronco com ramificações em alturas diferentes
  branching: (c) => ({
    core: { shape: 'box', sections: coreSections(1.1, Math.min(4, 2 + Math.floor(c / 2)), 3.0, 0.8), spire: true },
    satellites: [
      { x: -2.2, z: -1.5, w: 1.0, d: 1.0, h: 2.6, tiers: 3, shape: 'box' },
      { x: 2.2, z: -0.9, w: 1.0, d: 1.0, h: 3.0, tiers: 3, shape: 'box' },
      { x: -2.1, z: 2.1, w: 0.9, d: 0.9, h: 1.8, tiers: 2, shape: 'box' },
      { x: 2.0, z: 2.3, w: 0.9, d: 0.9, h: 2.2, tiers: 2, shape: 'box' },
    ],
    connectors: [
      { kind: 'bridge', from: -1, to: 0, y: 2.0 },
      { kind: 'bridge', from: -1, to: 1, y: 1.4 },
      { kind: 'bridge', from: 0, to: 2, y: 1.2 },
      { kind: 'bridge', from: 1, to: 3, y: 1.6 },
    ],
  }),

  // ETL — entrada → transformação → saída, em linha
  flow: (c) => ({
    core: { shape: 'box', sections: coreSections(1.6, 2, 2.6, 0.75), spire: false },
    satellites: [
      { x: -2.8, z: 0, w: 1.1, d: 1.7, h: 2.6 + c * 0.1, tiers: 3, shape: 'box' },
      { x: 2.8, z: 0, w: 1.1, d: 1.7, h: 2.0, tiers: 2, shape: 'box' },
      { x: 0, z: -2.5, w: 1.0, d: 1.0, h: 2.4, tiers: 2, shape: 'cyl' },
    ],
    connectors: [
      { kind: 'bridge', from: 0, to: -1, y: 1.5 },
      { kind: 'bridge', from: -1, to: 1, y: 1.5 },
      { kind: 'bridge', from: -1, to: 2, y: 1.0 },
    ],
  }),

  // Testing — portais de validação ao redor do núcleo
  checkpoint: (c) => ({
    core: { shape: 'box', sections: coreSections(1.2, 2 + Math.min(1, c - 1), 2.8, 0.75), spire: true },
    satellites: [
      { x: 0, z: 2.4, w: 1.6, d: 0.35, h: 1.9, tiers: 1, shape: 'gate' },
      { x: 2.4, z: 0, w: 1.6, d: 0.35, h: 1.9, tiers: 1, shape: 'gate', rot: Math.PI / 2 },
      { x: 0, z: -2.4, w: 1.6, d: 0.35, h: 1.9, tiers: 1, shape: 'gate' },
      { x: -2.4, z: 0, w: 1.6, d: 0.35, h: 1.9, tiers: 1, shape: 'gate', rot: Math.PI / 2 },
      { x: -2.2, z: -2.2, w: 0.7, d: 0.7, h: 2.3, tiers: 3, shape: 'box' },
      { x: 2.2, z: 2.2, w: 0.7, d: 0.7, h: 2.3, tiers: 3, shape: 'box' },
    ],
    connectors: [],
  }),

  // Farol — uma torre muito alta (o saber que ilumina) cercada por salões baixos
  beacon: (c) => {
    const s = 2.45;
    const hall = (x: number, z: number): SatelliteSpec => ({ x, z, w: 1.25, d: 1.25, h: 1.5, tiers: 2, shape: 'box' });
    return {
      core: { shape: 'box', sections: coreSections(1.7, Math.min(5, c), 3.3, 0.8), spire: true },
      satellites: [hall(-s, -s), hall(s, -s), hall(s, s), hall(-s, s)],
      connectors: [
        { kind: 'bridge', from: 0, to: 3, y: 0.9 },
        { kind: 'bridge', from: 1, to: 2, y: 0.9 },
      ],
    };
  },

  // System Design — vários sistemas interconectados em malha
  network: (c) => {
    const s = 2.55;
    const sat = (x: number, z: number, h: number): SatelliteSpec => ({ x, z, w: 1.15, d: 1.15, h, tiers: 3, shape: 'box' });
    return {
      core: { shape: 'box', sections: coreSections(1.4, Math.min(4, c), 3.2, 0.78), spire: true },
      satellites: [sat(-s, -s, 3.4), sat(s, -s, 2.8), sat(s, s, 3.1), sat(-s, s, 2.6)],
      connectors: [
        { kind: 'bridge', from: -1, to: 0, y: 2.4 },
        { kind: 'bridge', from: -1, to: 1, y: 1.8 },
        { kind: 'bridge', from: -1, to: 2, y: 2.2 },
        { kind: 'bridge', from: -1, to: 3, y: 1.6 },
        { kind: 'bridge', from: 0, to: 1, y: 1.2 },
        { kind: 'bridge', from: 2, to: 3, y: 1.2 },
      ],
    };
  },
};

/** Footprint (meia-extensão) do núcleo na fundação. */
export function coreHalf(bp: Pick<Blueprint, 'core'>): number {
  return bp.core.sections[0].w / 2;
}

export function createBlueprint(config: SkillCityConfig): Blueprint {
  const c = Math.max(1, Math.min(5, Math.round(config.complexity)));
  const layout = layouts[config.archetype](c);
  let ext = coreHalf(layout) + 0.3;
  for (const s of layout.satellites) {
    const corners = rectCorners({ x: s.x, z: s.z, w: s.w, d: s.d, rot: s.rot });
    for (const [x, z] of corners) ext = Math.max(ext, Math.abs(x), Math.abs(z));
  }
  return { ...layout, foundation: { half: +(ext + 0.55).toFixed(3), height: FOUNDATION_H } };
}

/** Ponto de contato na borda de um corpo (círculo ou retângulo) na direção dada. */
function faceDistance(w: number, d: number, shape: string, dx: number, dz: number): number {
  if (shape === 'cyl') return w / 2;
  const tx = Math.abs(dx) > 1e-6 ? w / 2 / Math.abs(dx) : Infinity;
  const tz = Math.abs(dz) > 1e-6 ? d / 2 / Math.abs(dz) : Infinity;
  return Math.min(tx, tz);
}

export interface ConnectorGeometry {
  /** Centro (x, z) final do conector. */
  x: number;
  z: number;
  length: number;
  /** Rotação em Y: o eixo local X aponta de `from` para `to`. */
  rot: number;
  /** Para dutos: posição inicial (dentro do núcleo). Para pontes = centro. */
  startX: number;
  startZ: number;
  /** Pontes: quanto cada trava precisa avançar para tocar a face do corpo (a → b). */
  latchA: number;
  latchB: number;
}

const CORE_PAD = 0.3;
const SAT_PAD = 0.15;
export const SLOT_WIDTH = 0.34;

interface Body {
  x: number;
  z: number;
  w: number;
  d: number;
  shape: string;
  pad: number;
}

function bodyOf(bp: Blueprint, i: number): Body {
  if (i < 0) {
    const w = bp.core.sections[0].w;
    return { x: 0, z: 0, w, d: w, shape: bp.core.shape, pad: CORE_PAD };
  }
  const s = bp.satellites[i];
  return { x: s.x, z: s.z, w: s.w, d: s.d, shape: s.shape, pad: SAT_PAD };
}

/** Calcula o vão entre dois corpos para uma ponte ou duto. */
export function connectorGeometry(bp: Blueprint, cs: ConnectorSpec): ConnectorGeometry {
  const a = bodyOf(bp, cs.from);
  const b = bodyOf(bp, cs.to);
  const dx0 = b.x - a.x;
  const dz0 = b.z - a.z;
  const dist = Math.hypot(dx0, dz0);
  const dx = dx0 / dist;
  const dz = dz0 / dist;
  const fa = faceDistance(a.w, a.d, a.shape, dx, dz);
  const fb = faceDistance(b.w, b.d, b.shape, dx, dz);
  const rot = Math.atan2(-dz, dx);
  if (cs.kind === 'pipe') {
    // Duto: embute nos dois corpos; recolhido fica inteiro dentro do núcleo
    const len = dist - fa - fb + 0.7;
    const off = fa - 0.35 + len / 2;
    return { x: a.x + dx * off, z: a.z + dz * off, length: len, rot, startX: a.x, startZ: a.z, latchA: 0, latchB: 0 };
  }
  // Ponte: começa depois da borda do FURO de cada corpo (os furos são retângulos
  // com folga), para que a fenda nunca toque os furos vizinhos.
  const ha = faceDistance(a.w + a.pad, a.d + a.pad, 'box', dx, dz) + 0.08;
  const hb = faceDistance(b.w + b.pad, b.d + b.pad, 'box', dx, dz) + 0.08;
  const len = dist - ha - hb;
  const mid = ha + len / 2;
  const cx = a.x + dx * mid;
  const cz = a.z + dz * mid;
  return { x: cx, z: cz, length: len, rot, startX: cx, startZ: cz, latchA: ha - fa + 0.04, latchB: hb - fb + 0.04 };
}

/** Furos da fundação: núcleo, satélites e fendas das pontes. */
export function foundationHoles(bp: Blueprint): RectHole[] {
  const holes: RectHole[] = [];
  const cw = bp.core.sections[0].w + CORE_PAD;
  holes.push({ x: 0, z: 0, w: cw, d: cw });
  for (const s of bp.satellites) holes.push({ x: s.x, z: s.z, w: s.w + SAT_PAD, d: s.d + SAT_PAD, rot: s.rot });
  for (const c of bp.connectors) {
    if (c.kind !== 'bridge') continue;
    const g = connectorGeometry(bp, c);
    holes.push({ x: g.x, z: g.z, w: g.length + 0.06, d: SLOT_WIDTH, rot: g.rot });
  }
  return holes;
}
